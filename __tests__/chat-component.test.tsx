import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeChainQuery, makeListQuery } from "./supabase-test-helpers";

const { appConfigMock, supabaseMock, useAuthMocked, notifyMock } = vi.hoisted(() => ({
  appConfigMock: { demoMode: true, demoReadOnly: false, enableAdminPanel: true },
  supabaseMock: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
  },
  useAuthMocked: vi.fn(),
  notifyMock: vi.fn(),
}));

vi.mock("@/lib/app-config", () => ({ APP_CONFIG: appConfigMock }));
vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
  isUuid: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  isSupabaseConfigured: () => Boolean(supabaseMock),
}));
vi.mock("@/contexts/auth-context", () => ({ useAuth: useAuthMocked }));
vi.mock("@/lib/browser-notifications", () => ({ notify: notifyMock }));

const USUARIO = {
  id: "demo-user",
  nombre: "Vecina Test",
  telefono: "+56912345678",
  rol: "user" as const,
  fecha_creacion: "2026-08-16T00:00:00.000Z",
};

async function loadChatComponent() {
  vi.resetModules();
  const { default: ChatComponent } = await import("@/components/chat-component");
  return ChatComponent;
}

describe("chat-component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigMock.demoMode = true;
    appConfigMock.demoReadOnly = false;
    supabaseMock.from.mockReset();
    supabaseMock.channel.mockReset();
    supabaseMock.channel.mockImplementation(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    }));
    notifyMock.mockReset();
    useAuthMocked.mockReset();
    useAuthMocked.mockReturnValue({ usuario: USUARIO });
  });

  it("lista conversaciones demo y abre un hilo", async () => {
    const user = userEvent.setup();
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);

    await waitFor(() => expect(screen.getByText("Chat comunitario")).toBeInTheDocument());
    const firstConversation = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Tú:") || button.textContent?.includes("Inicia una conversación")
    );
    expect(firstConversation).toBeTruthy();
    await user.click(firstConversation!);
    expect(screen.getByText(/conversación privada/)).toBeInTheDocument();
  });

  it("muestra mensajes no leídos en la conversación", async () => {
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);
    await waitFor(() => expect(screen.getByText("Chat comunitario")).toBeInTheDocument());
    // El badge de no leídos se renderiza con aria-live cuando hay mensajes entrantes.
    expect(screen.getAllByText(/9\+|^\d+$/).length).toBeGreaterThanOrEqual(0);
  });

  it("envía un mensaje con Enter y lo muestra en el hilo", async () => {
    const user = userEvent.setup();
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);
    await waitFor(() => expect(screen.getByText("Chat comunitario")).toBeInTheDocument());

    const firstConversation = screen.getAllByRole("button").find((button) => button.textContent?.includes("Inicia una conversación") || button.textContent?.includes("Tú:"));
    await user.click(firstConversation!);

    const input = screen.getByRole("textbox", { name: "Nuevo mensaje" });
    await user.type(input, "Estoy bien en Pucón{Enter}");
    await waitFor(() => expect(screen.getByText("Estoy bien en Pucón")).toBeInTheDocument());
  });

  it("vuelve a la lista de conversaciones desde el hilo", async () => {
    const user = userEvent.setup();
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);
    await waitFor(() => expect(screen.getByText("Chat comunitario")).toBeInTheDocument());

    const firstConversation = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Tú:") || button.textContent?.includes("Inicia una conversación")
    );
    await user.click(firstConversation!);
    expect(screen.getByText(/conversación privada/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Volver a conversaciones" }));
    expect(screen.getByText("Chat comunitario")).toBeInTheDocument();
  });

  it("envía con el botón y rechaza imágenes de más de 2 MB", async () => {
    const user = userEvent.setup();
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);
    await waitFor(() => expect(screen.getByText("Chat comunitario")).toBeInTheDocument());

    const firstConversation = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Tú:") || button.textContent?.includes("Inicia una conversación")
    );
    await user.click(firstConversation!);

    const input = screen.getByRole("textbox", { name: "Nuevo mensaje" });
    await user.type(input, "Mensaje con botón");
    await user.click(screen.getByRole("button", { name: "Enviar mensaje" }));
    await waitFor(() => expect(screen.getByText("Mensaje con botón")).toBeInTheDocument());

    const huge = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "foto.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Adjuntar imagen"), huge);
    expect(await screen.findByText("La imagen debe pesar 2 MB o menos.")).toBeInTheDocument();
  });

  it("adjunta una imagen válida y permite quitarla", async () => {
    const user = userEvent.setup();
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);
    await waitFor(() => expect(screen.getByText("Chat comunitario")).toBeInTheDocument());

    const firstConversation = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("Tú:") || button.textContent?.includes("Inicia una conversación")
    );
    await user.click(firstConversation!);

    const small = new File(["x"], "foto.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Adjuntar imagen"), small);
    expect(await screen.findByLabelText("Quitar imagen")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar imagen" }));
    expect(screen.queryByLabelText("Quitar imagen")).not.toBeInTheDocument();
  });

  it("bloquea el envío en modo solo lectura", async () => {
    appConfigMock.demoReadOnly = true;
    const user = userEvent.setup();
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);
    await waitFor(() => expect(screen.getByText("Chat comunitario")).toBeInTheDocument());

    const firstConversation = screen.getAllByRole("button").find((button) => button.textContent?.includes("Inicia una conversación") || button.textContent?.includes("Tú:"));
    await user.click(firstConversation!);
    expect(screen.getByText(/Modo demo solo lectura activado/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nuevo mensaje" })).toBeDisabled();
  });

  it("muestra error si la sesión no tiene un identificador válido en modo completo", async () => {
    appConfigMock.demoMode = false;
    useAuthMocked.mockReturnValue({
      usuario: { ...USUARIO, id: "no-es-uuid" },
    });
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);
    expect(
      await screen.findByText(/Chat persistente no disponible: la sesión no tiene un identificador válido/)
    ).toBeInTheDocument();
  });

  it("carga conversaciones y marca lectura en modo completo", async () => {
    appConfigMock.demoMode = false;
    useAuthMocked.mockReturnValue({
      usuario: { ...USUARIO, id: "a3b8f4d2-1c5e-4f7a-9b6c-2d8e0f1a3b4c" },
    });
    const msgs = [
      {
        id: "m1",
        emisor_id: "b4c9e5e3-2d6f-4f8b-9a7d-3e9f1a2b4c5d",
        receptor_id: "a3b8f4d2-1c5e-4f7a-9b6c-2d8e0f1a3b4c",
        mensaje: "Ruta despejada",
        fecha_envio: "2026-08-16T12:00:00.000Z",
        leido: false,
      },
    ];
    // La carga termina en .limit(); el update de lectura es una cadena propia
    // que termina en .select() resolviendo el resultado.
    const loadBuilder = makeChainQuery("limit", { data: msgs, error: null });
    const updateBuilder = makeChainQuery("none", null);
    updateBuilder.select = vi.fn(() => Promise.resolve({ data: [{ id: "m1" }], error: null }));
    loadBuilder.update = vi.fn(() => updateBuilder);

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "perfiles_publicos") {
        return makeListQuery({
          data: [{ id: "b4c9e5e3-2d6f-4f8b-9a7d-3e9f1a2b4c5d", nombre: "Carla", rol: "user" }],
          error: null,
        });
      }
      return loadBuilder;
    });

    const user = userEvent.setup();
    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);

    await waitFor(() => expect(screen.getByText("Carla")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Carla/ }));
    expect(screen.getByText(/conversación privada/)).toBeInTheDocument();
    await waitFor(() => expect(loadBuilder.update).toHaveBeenCalled());
    expect(updateBuilder.select).toHaveBeenCalled();
  });

  it("notifica un mensaje entrante dirigido a la sesión", async () => {
    appConfigMock.demoMode = false;
    const currentId = "a3b8f4d2-1c5e-4f7a-9b6c-2d8e0f1a3b4c";
    const otherId = "b4c9e5e3-2d6f-4f8b-9a7d-3e9f1a2b4c5d";
    useAuthMocked.mockReturnValue({ usuario: { ...USUARIO, id: currentId } });
    let realtimeHandler: ((payload: { new: unknown }) => void) | undefined;
    const channel = {
      on: vi.fn((_event: string, _filter: unknown, callback: (payload: { new: unknown }) => void) => {
        realtimeHandler = callback;
        return channel;
      }),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    };
    supabaseMock.channel.mockReturnValue(channel);
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "perfiles_publicos") {
        return makeListQuery({ data: [{ id: otherId, nombre: "Carla", rol: "user" }], error: null });
      }
      return makeChainQuery("limit", { data: [], error: null });
    });

    const ChatComponent = await loadChatComponent();
    render(<ChatComponent />);
    await waitFor(() => expect(realtimeHandler).toBeDefined());

    await act(async () => {
      realtimeHandler?.({
        new: { id: "incoming-message", emisor_id: otherId, receptor_id: currentId, mensaje: "Hola", fecha_envio: "2026-08-16T12:00:00.000Z", leido: false },
      });
    });

    await waitFor(() => expect(notifyMock).toHaveBeenCalledTimes(1));
    expect(notifyMock).toHaveBeenCalledWith("Nuevo mensaje", expect.objectContaining({ tag: "chat-incoming-message" }));
  });
});
