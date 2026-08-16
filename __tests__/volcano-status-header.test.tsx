import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VolcanoStatusHeader from "@/components/volcano-status-header";

const { appConfigMock, useAlertMocked } = vi.hoisted(() => ({
  appConfigMock: { demoMode: true, enableAdminPanel: true },
  useAlertMocked: vi.fn(),
}));

vi.mock("@/lib/app-config", () => ({ APP_CONFIG: appConfigMock }));
vi.mock("@/contexts/alert-context", () => ({ useAlert: useAlertMocked }));

function alerta(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    nivel_alerta: "verde" as const,
    descripcion: "Monitoreo normal, sin anomalías.",
    fuente: "Sernageomin RNVV/OVDAS",
    referencia: "RAV N° 214/2026",
    es_simulacion: false,
    ultima_actualizacion: new Date().toISOString(),
    ...overrides,
  };
}

describe("volcano-status-header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigMock.demoMode = true;
  });

  it("muestra el skeleton mientras carga", () => {
    useAlertMocked.mockReturnValue({ alerta: null, loading: true, hasError: false });
    render(<VolcanoStatusHeader />);
    expect(screen.getByLabelText("Cargando estado del volcán")).toBeInTheDocument();
  });

  it("muestra el fallback de error sin alerta disponible", () => {
    useAlertMocked.mockReturnValue({ alerta: null, loading: false, hasError: true });
    render(<VolcanoStatusHeader />);
    expect(
      screen.getByText("No pudimos actualizar el estado. Revisa los canales oficiales antes de actuar.")
    ).toBeInTheDocument();
  });

  it("muestra el nivel, la frescura, la fuente y la referencia de la alerta", () => {
    useAlertMocked.mockReturnValue({
      alerta: alerta({ ultima_actualizacion: new Date().toISOString() }),
      loading: false,
      hasError: false,
    });
    render(<VolcanoStatusHeader />);

    expect(screen.getByText("Volcán Villarrica")).toBeInTheDocument();
    expect(screen.getByText(/Sernageomin RNVV\/OVDAS/)).toBeInTheDocument();
    expect(screen.getByText(/Referencia: RAV N° 214\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/hora Chile/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado del Villarrica/)).toBeInTheDocument();
  });

  it("etiqueta la simulación de instalación fuera de demo", () => {
    appConfigMock.demoMode = false;
    useAlertMocked.mockReturnValue({
      alerta: alerta({ es_simulacion: true }),
      loading: false,
      hasError: false,
    });
    render(<VolcanoStatusHeader />);
    expect(screen.getByText("Simulación de instalación")).toBeInTheDocument();
  });

  it("etiqueta la simulación demo en modo demo", () => {
    useAlertMocked.mockReturnValue({
      alerta: alerta(),
      loading: false,
      hasError: false,
    });
    render(<VolcanoStatusHeader />);
    expect(screen.getByText("Simulación demo")).toBeInTheDocument();
  });

  it("marca la información como posiblemente desactualizada", () => {
    useAlertMocked.mockReturnValue({
      alerta: alerta({ ultima_actualizacion: "2020-01-01T00:00:00.000Z" }),
      loading: false,
      hasError: false,
    });
    render(<VolcanoStatusHeader />);
    expect(screen.getByText("Información posiblemente desactualizada")).toBeInTheDocument();
  });

  it("conserva la última alerta y muestra el estado accionable si falla el refresh", () => {
    appConfigMock.demoMode = false;
    useAlertMocked.mockReturnValue({
      alerta: alerta(),
      loading: false,
      hasError: true,
      realtimeStatus: "channel_error",
    });
    render(<VolcanoStatusHeader />);
    expect(screen.getByText("Volcán Villarrica")).toBeInTheDocument();
    expect(screen.getByText(/Última lectura disponible/)).toBeInTheDocument();
    expect(screen.getByText(/Canal en tiempo real no confirmado/)).toBeInTheDocument();
  });

  it("usa el nombre oficial del volcán si la alerta lo trae", () => {
    useAlertMocked.mockReturnValue({
      alerta: alerta({ informacion_volcan: { nombre: "Villarrica" } }),
      loading: false,
      hasError: false,
    });
    render(<VolcanoStatusHeader />);
    expect(screen.getByText("Volcán Villarrica")).toBeInTheDocument();
  });

  it("muestra la acción recomendada para el nivel", () => {
    useAlertMocked.mockReturnValue({
      alerta: alerta({ nivel_alerta: "naranja" as const }),
      loading: false,
      hasError: false,
    });
    render(<VolcanoStatusHeader />);
    expect(screen.getByText("Qué hacer ahora")).toBeInTheDocument();
  });
});
