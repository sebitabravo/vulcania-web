import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VulcaniaApp from "@/app/page";
import type { Usuario } from "@/lib/supabase";

const { logout, useAuthMocked } = vi.hoisted(() => ({
  logout: vi.fn(),
  useAuthMocked: vi.fn(),
}));

// En tests, el loading de cada dynamic se usa como componente para ejercitar
// el skeleton PanelLoading de la página.
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: unknown, options?: { loading?: React.ComponentType }) =>
    options?.loading ?? (() => null),
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
  APP_CONFIG: { demoMode: true, enableAdminPanel: true },
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

  it("muestra el botón Operador solo con rol operator o admin", () => {
    useAuthMocked.mockReturnValue({ usuario: USUARIO_OPERADOR, logout, loading: false });
    render(<VulcaniaApp />);
    expect(screen.getByRole("button", { name: /Operador/ })).toBeInTheDocument();
  });

  it("no muestra el botón Operador con rol user", () => {
    render(<VulcaniaApp />);
    expect(screen.queryByRole("button", { name: /Operador/ })).not.toBeInTheDocument();
  });

  it("cierra sesión desde el header", () => {
    render(<VulcaniaApp />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
