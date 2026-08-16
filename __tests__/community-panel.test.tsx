import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeChainQuery, makeListQuery } from "./supabase-test-helpers";

const { appConfigMock, supabaseRef, supabaseMock, supabaseConfiguredMock, useAuthMocked, notifyMock } = vi.hoisted(() => {
  const supabaseMock = {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
  };
  return {
    appConfigMock: { demoMode: true, demoReadOnly: false, enableAdminPanel: true },
    supabaseRef: { current: supabaseMock } as { current: typeof supabaseMock | null },
    supabaseMock,
    supabaseConfiguredMock: { value: false },
    useAuthMocked: vi.fn(),
    notifyMock: vi.fn(),
  };
});

vi.mock("@/lib/app-config", () => ({ APP_CONFIG: appConfigMock }));
// Getter para poder simular "sin Supabase" (supabase falsy) por test.
vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return supabaseRef.current;
  },
  isSupabaseConfigured: () => supabaseConfiguredMock.value,
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

async function loadCommunityPanel() {
  vi.resetModules();
  const { default: CommunityPanel } = await import("@/components/community-panel");
  return CommunityPanel;
}

describe("community-panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigMock.demoMode = true;
    appConfigMock.demoReadOnly = false;
    supabaseRef.current = supabaseMock;
    supabaseMock.from.mockReset();
    supabaseMock.channel.mockReset();
    supabaseMock.channel.mockImplementation(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    }));
    supabaseConfiguredMock.value = false;
    notifyMock.mockReset();
    useAuthMocked.mockReset();
    useAuthMocked.mockReturnValue({ usuario: USUARIO });
  });

  it("lista reportes demo con autor y frescura", async () => {
    const CommunityPanel = await loadCommunityPanel();
    render(<CommunityPanel />);

    expect(await screen.findByText("Reportes del territorio")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/reportes$/)).toBeInTheDocument());
  });

  it("publica un reporte y lo muestra en el feed", async () => {
    const user = userEvent.setup();
    const CommunityPanel = await loadCommunityPanel();
    render(<CommunityPanel />);
    await waitFor(() => expect(screen.getByText(/reportes$/)).toBeInTheDocument());

    const textarea = screen.getByRole("textbox", { name: "Texto del reporte comunitario" });
    await user.type(textarea, "Columna de humo visible desde Pucón");
    await user.click(screen.getByRole("button", { name: /Publicar reporte/ }));

    expect(await screen.findByText("Columna de humo visible desde Pucón")).toBeInTheDocument();
    expect(screen.getAllByText(/Comunitario/).length).toBeGreaterThanOrEqual(1);
  });

  it("exige texto o imagen antes de publicar", async () => {
    const user = userEvent.setup();
    const CommunityPanel = await loadCommunityPanel();
    render(<CommunityPanel />);
    await waitFor(() => expect(screen.getByText(/reportes$/)).toBeInTheDocument());

    // El botón se deshabilita con el contenido vacío; Ctrl+Enter llega al
    // guard de validación por la vía del teclado.
    const textarea = screen.getByRole("textbox", { name: "Texto del reporte comunitario" });
    await user.click(textarea);
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(await screen.findByText("Escribe un reporte o adjunta una imagen antes de enviar.")).toBeInTheDocument();
  });

  it("rechaza imágenes de más de 2 MB y acepta una válida con preview", async () => {
    const user = userEvent.setup();
    const CommunityPanel = await loadCommunityPanel();
    render(<CommunityPanel />);
    await waitFor(() => expect(screen.getByText(/reportes$/)).toBeInTheDocument());

    const huge = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "foto.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Adjuntar"), huge);
    expect(await screen.findByText("La imagen debe pesar 2 MB o menos.")).toBeInTheDocument();

    const small = new File(["x"], "foto.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Adjuntar"), small);
    expect(await screen.findByLabelText("Quitar imagen")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar imagen" }));
    expect(screen.queryByLabelText("Quitar imagen")).not.toBeInTheDocument();
  });

  it("bloquea la publicación en modo solo lectura", async () => {
    appConfigMock.demoReadOnly = true;
    const CommunityPanel = await loadCommunityPanel();
    render(<CommunityPanel />);

    expect(await screen.findByText(/Modo demo solo lectura activado/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Texto del reporte comunitario" })).toBeDisabled();
  });

  it("muestra aviso de Supabase no configurado en modo completo", async () => {
    appConfigMock.demoMode = false;
    supabaseRef.current = null;
    const CommunityPanel = await loadCommunityPanel();
    render(<CommunityPanel />);

    expect(
      await screen.findByText(/Base de datos no configurada. El demo offline está disponible desde el acceso inicial/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Configura Supabase para habilitar la comunidad persistente/)
    ).toBeInTheDocument();
  });

  it("carga y publica reportes persistidos en modo completo", async () => {
    appConfigMock.demoMode = false;
    supabaseConfiguredMock.value = true;
    supabaseRef.current!.from.mockImplementation((table: string) => {
      if (table === "avisos_comunidad") {
        const load = makeChainQuery("limit", {
          data: [{ id: "a1", usuario_id: "u1", autor_nombre: "Carla", mensaje: "Ruta despejada", fecha_creacion: "2026-08-16T12:00:00.000Z", estado: "activo" }],
          error: null,
        });
        // El insert es una cadena propia que termina en .single().
        const insertBuilder = makeChainQuery("single", {
          data: { id: "a2", usuario_id: "demo-user", autor_nombre: "Vecina Test", mensaje: "Evacuación preventiva en sector bajo", fecha_creacion: "2026-08-16T12:30:00.000Z", estado: "activo" },
          error: null,
        });
        load.insert = vi.fn(() => insertBuilder);
        return load;
      }
      return makeListQuery({ data: [], error: null });
    });

    const user = userEvent.setup();
    const CommunityPanel = await loadCommunityPanel();
    render(<CommunityPanel />);

    expect(await screen.findByText("Ruta despejada")).toBeInTheDocument();

    const textarea = screen.getByRole("textbox", { name: "Texto del reporte comunitario" });
    await user.type(textarea, "Evacuación preventiva en sector bajo");
    await user.click(screen.getByRole("button", { name: /Publicar reporte/ }));

    expect(await screen.findByText("Evacuación preventiva en sector bajo")).toBeInTheDocument();
  });

  it("notifica un reporte entrante de otra persona, pero no el propio", async () => {
    appConfigMock.demoMode = false;
    supabaseConfiguredMock.value = true;
    let realtimeHandler: ((payload: { eventType: string; new: unknown }) => void) | undefined;
    const channel = {
      on: vi.fn((_event: string, _filter: unknown, callback: (payload: { eventType: string; new: unknown }) => void) => {
        realtimeHandler = callback;
        return channel;
      }),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    };
    supabaseMock.channel.mockReturnValue(channel);
    supabaseMock.from.mockImplementation(() => makeChainQuery("limit", { data: [], error: null }));

    const CommunityPanel = await loadCommunityPanel();
    render(<CommunityPanel />);
    await waitFor(() => expect(realtimeHandler).toBeDefined());

    await act(async () => {
      realtimeHandler?.({
        eventType: "INSERT",
        new: { id: "incoming", usuario_id: "otro", autor_nombre: "Otra persona", mensaje: "Ruta despejada", fecha_creacion: "2026-08-16T12:00:00.000Z", estado: "activo" },
      });
      realtimeHandler?.({
        eventType: "INSERT",
        new: { id: "own", usuario_id: USUARIO.id, autor_nombre: USUARIO.nombre, mensaje: "Mi reporte", fecha_creacion: "2026-08-16T12:01:00.000Z", estado: "activo" },
      });
    });

    await waitFor(() => expect(notifyMock).toHaveBeenCalledTimes(1));
    expect(notifyMock).toHaveBeenCalledWith("Nuevo aviso comunitario", expect.objectContaining({ tag: "community-feed" }));
  });
});
