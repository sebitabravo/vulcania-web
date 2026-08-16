import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VulcaniaApp from "@/app/page";
import type { Usuario } from "@/lib/supabase";

const { logout, useAuthMocked, appConfigMock } = vi.hoisted(() => ({
  logout: vi.fn(),
  useAuthMocked: vi.fn(),
  appConfigMock: { demoMode: true, enableAdminPanel: true },
}));

// En tests, el loading de cada dynamic se usa como componente para ejercitar
// el skeleton PanelLoading de la página; el panel sin loading (AdminPanel)
// resuelve el módulo mockeado tras el montaje.
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (
    loader: () => Promise<{ default: React.ComponentType }>,
    options?: { loading?: React.ComponentType }
  ) => {
    if (options?.loading) return options.loading;
    const LazyPanel = () => {
      const [Component, setComponent] = useState<React.ComponentType | null>(null);
      useEffect(() => {
        loader().then((mod) => setComponent(() => mod.default ?? (() => null)));
      }, []);
      return Component ? <Component /> : null;
    };
    return LazyPanel;
  },
}));

vi.mock("@/components/admin-panel", () => ({
  default: () => <div data-testid="admin-panel" />,
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: useAuthMocked,
}));

vi.mock("@/components/login-screen", () => ({
  default: () => <div data-testid="login-screen">Login stub</div>,
}));

vi.mock("@/components/volcano-status-header", () => ({
  default: () => <div data-testid="volcano-header">Estado volcán</div>,
}));

vi.mock("@/lib/app-config", () => ({
  APP_CONFIG: appConfigMock,
}));

const USUARIO_DEMO: Usuario = {
  id: "u1",
  nombre: "Vecina Test",
  telefono: "+56912345678",
  rol: "user",
  fecha_creacion: "2026-08-16T00:00:00.000Z",
};

const USUARIO_OPERADOR: Usuario = {
  ...USUARIO_DEMO,
  id: "u2",
  nombre: "Operador",
  telefono: "+56900000001",
  rol: "operator",
};

describe("app/page (shell)", () => {
  beforeEach(() => {
    logout.mockClear();
    useAuthMocked.mockReset();
    appConfigMock.demoMode = true;
    appConfigMock.enableAdminPanel = true;
    useAuthMocked.mockReturnValue({ usuario: USUARIO_DEMO, logout, loading: false });
  });

  it("muestra la pantalla de login sin usuario autenticado", () => {
    useAuthMocked.mockReturnValue({ usuario: null, logout, loading: false });
    render(<VulcaniaApp />);
    expect(screen.getByTestId("login-screen")).toBeInTheDocument();
  });

  it("muestra el shell principal con tabs y stats para un usuario", () => {
    render(<VulcaniaApp />);
    expect(screen.getByText("Tu red, en un solo lugar.")).toBeInTheDocument();
    expect(screen.getByText("Bienvenido, Vecina Test.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Mapa/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Comunidad/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Chat/ })).toBeInTheDocument();
    expect(screen.getByText("Vecina Test")).toBeInTheDocument();
    expect(screen.getByTestId("volcano-header")).toBeInTheDocument();
  });

  it("muestra el estado de carga mientras restaura la sesión", () => {
    useAuthMocked.mockReturnValue({ usuario: null, logout, loading: true });
    render(<VulcaniaApp />);
    expect(screen.getByText("Cargando Vulcania")).toBeInTheDocument();
    expect(screen.getByTestId("volcano-header")).toBeInTheDocument();
  });

  it("muestra el botón Operador para el flujo demo aunque el usuario sea user", () => {
    render(<VulcaniaApp />);
    expect(screen.getByRole("button", { name: /Operador/ })).toBeInTheDocument();
  });

  it("muestra el botón Operador con rol operator en modo completo", () => {
    appConfigMock.demoMode = false;
    useAuthMocked.mockReturnValue({ usuario: USUARIO_OPERADOR, logout, loading: false });
    render(<VulcaniaApp />);
    expect(screen.getByRole("button", { name: /Operador/ })).toBeInTheDocument();
  });

  it("no muestra el botón Operador con rol user en modo completo", () => {
    appConfigMock.demoMode = false;
    render(<VulcaniaApp />);
    expect(screen.queryByRole("button", { name: /Operador/ })).not.toBeInTheDocument();
  });

  it("abre la consola de operador desde el botón Operador", async () => {
    render(<VulcaniaApp />);
    fireEvent.click(screen.getByRole("button", { name: /Operador/ }));
    expect(await screen.findByTestId("admin-panel")).toBeInTheDocument();
  });

  it("cierra sesión desde el header", () => {
    render(<VulcaniaApp />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
