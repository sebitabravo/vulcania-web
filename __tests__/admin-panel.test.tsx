import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeChainQuery, makeListQuery, makeSingleQuery } from "./supabase-test-helpers";
import type { PuntoEncuentro } from "@/lib/supabase";

const { appConfigMock, supabaseMock } = vi.hoisted(() => ({
  appConfigMock: { demoMode: true, demoReadOnly: false, enableAdminPanel: true },
  supabaseMock: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
  },
}));

vi.mock("@/lib/app-config", () => ({ APP_CONFIG: appConfigMock }));
vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
  isSupabaseConfigured: () => Boolean(supabaseMock),
}));

const PUNTO: PuntoEncuentro = {
  id: "p1",
  nombre: "Estadio Pucón",
  direccion: "Av. O'Higgins 123",
  latitud: -39.2833,
  longitud: -71.95,
  capacidad: 120,
  seguridad_nivel: 4,
  tiempo_aprox_pie: 15,
  ocupado: false,
};

/** demo-data guarda estado de módulo (nivel y puntos): carga fresca por test. */
async function loadAdminPanel() {
  vi.resetModules();
  const { default: AdminPanel } = await import("@/components/admin-panel");
  return AdminPanel;
}

describe("admin-panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigMock.demoMode = true;
    appConfigMock.demoReadOnly = false;
    supabaseMock.from.mockReset();
    supabaseMock.rpc.mockReset();
  });

  it("carga el nivel y los puntos demo", async () => {
    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/puntos cargados/)).toBeInTheDocument());
    expect(screen.getByText("Consola de operador")).toBeInTheDocument();
    expect(screen.getByText(/Simulación demo/)).toBeInTheDocument();
  });

  it("confirma un cambio de nivel con doble paso y muestra el estado", async () => {
    const user = userEvent.setup();
    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/puntos cargados/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Roja/ }));
    expect(screen.getByText("Confirmar cambio operativo")).toBeInTheDocument();
    // El respaldo oficial se exige para rojo.
    expect(screen.getByText(/respaldo oficial \(RAV\/REAV\)/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(screen.getByText(/Nivel actualizado a Alerta Roja/)).toBeInTheDocument());
  });

  it("bloquea acciones en modo solo lectura", async () => {
    appConfigMock.demoReadOnly = true;
    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Modo solo lectura/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Roja/ })).toBeDisabled();
  });

  it("marca un punto como lleno y lo libera", async () => {
    const user = userEvent.setup();
    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Estadio Pucón")).toBeInTheDocument());

    await user.click(screen.getAllByRole("button", { name: /Marcar lleno/ })[0]);
    await waitFor(() => expect(screen.getByText(/marcado como lleno/)).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: /Liberar/ })[0]);
    await waitFor(() => expect(screen.getByText(/marcado como disponible/)).toBeInTheDocument());
  });

  it("resetea todos los puntos disponibles", async () => {
    const user = userEvent.setup();
    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/puntos cargados/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Resetear disponibles" }));
    await waitFor(() =>
      expect(screen.getByText("Todos los puntos quedaron disponibles.")).toBeInTheDocument()
    );
  });

  it("cierra con Escape y notifica a onClose", async () => {
    const onClose = vi.fn();
    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={onClose} />);
    await waitFor(() => expect(screen.getByText(/puntos cargados/)).toBeInTheDocument());

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("carga estado operativo, puntos y reportes desde Supabase en modo completo", async () => {
    appConfigMock.demoMode = false;
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "alertas_volcan") {
        return makeSingleQuery({ data: { nivel_alerta: "amarillo" }, error: null });
      }
      if (table === "puntos_encuentro") {
        return makeListQuery({ data: [PUNTO], error: null });
      }
      return makeChainQuery("limit", {
        data: [{ id: "m1", usuario_id: "u1", autor_nombre: "Carla", mensaje: "Ruta bloqueada", fecha_creacion: "2026-08-16T12:00:00.000Z", estado: "activo" }],
        error: null,
      });
    });
    supabaseMock.rpc.mockResolvedValue({ error: null });

    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Estadio Pucón")).toBeInTheDocument());
    expect(screen.getByText("Carla")).toBeInTheDocument();
    expect(screen.getByText("Ruta bloqueada")).toBeInTheDocument();
  });

  it("cambia el nivel por RPC y oculta un reporte en modo completo", async () => {
    appConfigMock.demoMode = false;
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "alertas_volcan") {
        return makeSingleQuery({ data: { nivel_alerta: "verde" }, error: null });
      }
      if (table === "puntos_encuentro") return makeListQuery({ data: [], error: null });
      return makeChainQuery("limit", {
        data: [{ id: "m1", usuario_id: "u1", autor_nombre: "Carla", mensaje: "Ruta bloqueada", fecha_creacion: "2026-08-16T12:00:00.000Z", estado: "activo" }],
        error: null,
      });
    });
    supabaseMock.rpc.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Carla")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Naranja/ }));
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(supabaseMock.rpc).toHaveBeenCalledWith("cambiar_nivel_alerta", { nuevo_nivel: "naranja" }));
    await waitFor(() => expect(screen.getByText(/Nivel actualizado a Alerta Naranja/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Ocultar reporte de Carla" }));
    await user.click(screen.getByRole("button", { name: "Ocultar reporte" }));
    await waitFor(() => expect(screen.queryByText("Ruta bloqueada")).not.toBeInTheDocument());
  });

  it("muestra error si falla la carga del estado operativo", async () => {
    appConfigMock.demoMode = false;
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "alertas_volcan") {
        return makeSingleQuery({ data: null, error: { message: "boom" } });
      }
      if (table === "puntos_encuentro") return makeListQuery({ data: [], error: null });
      return makeChainQuery("limit", { data: [], error: null });
    });

    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);
    expect(await screen.findByText("No pudimos cargar el estado operativo.")).toBeInTheDocument();
  });

  it("muestra error si el RPC de nivel falla", async () => {
    appConfigMock.demoMode = false;
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "alertas_volcan") return makeSingleQuery({ data: { nivel_alerta: "verde" }, error: null });
      if (table === "puntos_encuentro") return makeListQuery({ data: [], error: null });
      return makeChainQuery("limit", { data: [], error: null });
    });
    supabaseMock.rpc.mockResolvedValue({ error: { message: "forbidden" } });

    const user = userEvent.setup();
    const AdminPanel = await loadAdminPanel();
    render(<AdminPanel onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Consola de operador")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Roja/ }));
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(
      await screen.findByText("No se pudo actualizar el nivel. Verifica tu rol de operador y la conexión.")
    ).toBeInTheDocument();
  });
});
