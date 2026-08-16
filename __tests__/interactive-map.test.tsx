import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InteractiveMap, { streetViewUrl } from "@/components/interactive-map";

// -- Mocks hoisted compartidos ---------------------------------------------

const { useAlertMocked, appConfigMock, leaflet } = vi.hoisted(() => {
  const map = {
    setView: vi.fn(),
    whenReady: vi.fn((cb: () => void) => cb()),
    invalidateSize: vi.fn(),
    remove: vi.fn(),
    addLayer: vi.fn(),
  };
  const layerGroup = {
    addTo: vi.fn(),
    clearLayers: vi.fn(),
  };
  layerGroup.addTo.mockReturnValue(layerGroup);
  const tileLayer = { addTo: vi.fn() };
  tileLayer.addTo.mockReturnValue(map);
  const markerInstance = {
    bindTooltip: vi.fn(),
    on: vi.fn(),
    addTo: vi.fn(),
  };
  markerInstance.bindTooltip.mockReturnValue(markerInstance);
  markerInstance.addTo.mockReturnValue(markerInstance);
  const circleInstance = {
    addTo: vi.fn(),
    bindTooltip: vi.fn(),
  };
  circleInstance.addTo.mockReturnValue(circleInstance);

  return {
    useAlertMocked: vi.fn(),
    appConfigMock: { demoMode: true, enableAdminPanel: false },
    leaflet: {
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => tileLayer),
      layerGroup: vi.fn(() => layerGroup),
      divIcon: vi.fn(() => ({})),
      marker: vi.fn(() => ({ ...markerInstance })),
      circle: vi.fn(() => ({ ...circleInstance })),
      _map: map,
      _layerGroup: layerGroup,
      _marker: markerInstance,
      _circle: circleInstance,
    },
  };
});

vi.mock("leaflet", () => ({
  map: leaflet.map,
  tileLayer: leaflet.tileLayer,
  layerGroup: leaflet.layerGroup,
  divIcon: leaflet.divIcon,
  marker: leaflet.marker,
  circle: leaflet.circle,
}));

vi.mock("@/contexts/alert-context", () => ({
  useAlert: useAlertMocked,
}));

vi.mock("@/lib/app-config", () => ({
  APP_CONFIG: appConfigMock,
}));

// -- Stubs de entorno ------------------------------------------------------

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function stubEnvironment() {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
}

describe("interactive-map", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigMock.demoMode = true;
    useAlertMocked.mockReturnValue({ alerta: null });
    stubEnvironment();
  });

  it("renderiza la shell con puntos demo, leyenda y selector de zona", async () => {
    render(<InteractiveMap />);

    expect(screen.getByRole("heading", { name: "Puntos de encuentro" })).toBeInTheDocument();
    expect(screen.getByText(/Simulación demo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pucón" })).toBeInTheDocument();
    expect(screen.getByText("Volcán monitoreado")).toBeInTheDocument();

    // Lista textual con los puntos demo.
    await waitFor(() => expect(screen.getByText(/ubicaciones/)).toBeInTheDocument());
    const ubicaciones = screen.getByText(/ubicaciones/);
    expect(ubicaciones.textContent).toMatch(/\d+ ubicaciones/);
  });

  it("inicializa Leaflet una vez con basemap oscuro y layer group", async () => {
    render(<InteractiveMap />);
    await waitFor(() => expect(leaflet.map).toHaveBeenCalledTimes(1));
    expect(leaflet.tileLayer).toHaveBeenCalledWith(
      expect.stringContaining("cartocdn.com/dark_all"),
      expect.objectContaining({ maxZoom: 19 })
    );
    expect(leaflet.layerGroup).toHaveBeenCalledTimes(1);
    expect(leaflet._layerGroup.addTo).toHaveBeenCalled();
  });

  it("limpia la capa y puebla un marcador por punto más el volcán", async () => {
    render(<InteractiveMap />);
    // El volcán más cada punto de encuentro demo.
    await waitFor(() =>
      expect(leaflet.marker.mock.calls.length).toBeGreaterThanOrEqual(2)
    );
    expect(leaflet._layerGroup.clearLayers).toHaveBeenCalled();
    expect(leaflet.divIcon).toHaveBeenCalled();
  });

  it("dibuja la zona de exclusión cuando hay alerta activa", async () => {
    useAlertMocked.mockReturnValue({
      alerta: {
        id: "a1",
        nivel_alerta: "naranja" as const,
        descripcion: "Actividad en ascenso",
        ultima_actualizacion: "2026-08-16T12:00:00.000Z",
      },
    });
    render(<InteractiveMap />);

    await waitFor(() => expect(leaflet.circle).toHaveBeenCalled());
    const [center, options] = leaflet.circle.mock.calls[0] as unknown as [
      [number, number],
      { radius: number; color: string; dashArray: string }
    ];
    expect(center).toEqual([-39.4167, -71.9333]);
    expect(options.radius).toBeGreaterThan(0);
    expect(options.dashArray).toBe("6 6");
    // El banner de la zona (la leyenda repite el mismo texto).
    expect(screen.getByText("Zona de exclusión referencial", { selector: "strong" })).toBeInTheDocument();
  });

  it("cambia la zona del mapa al seleccionar una ubicación", async () => {
    const user = userEvent.setup();
    render(<InteractiveMap />);
    await waitFor(() => expect(leaflet.map).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Villarrica" }));
    await waitFor(() =>
      expect(leaflet._map.setView).toHaveBeenCalledWith(
        [-39.2833, -72.2333],
        11,
        { animate: false }
      )
    );
  });

  it("centra el mapa en el punto seleccionado desde la lista accesible", async () => {
    const user = userEvent.setup();
    render(<InteractiveMap />);
    await waitFor(() => expect(screen.getByText(/ubicaciones/)).toBeInTheDocument());

    const pointButton = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("a pie")
    );
    expect(pointButton).toBeTruthy();
    await user.click(pointButton!);
    await waitFor(() =>
      expect(leaflet._map.setView).toHaveBeenCalledWith(
        expect.any(Array),
        14,
        { animate: true }
      )
    );
  });

  it("restaura el enlace RA como Street View por coordenadas", async () => {
    render(<InteractiveMap />);
    const streetView = await screen.findByRole("link", { name: /Ver RA \(Street View\) de Estadio Pucón/ });
    expect(streetView).toHaveAttribute("href", expect.stringContaining("api=1"));
    expect(streetView).toHaveAttribute("href", expect.stringContaining("map_action=pano"));
    expect(streetView).toHaveAttribute("href", expect.stringContaining("viewpoint=-39.2796%2C-71.9725"));
    expect(streetViewUrl({
      id: "test",
      nombre: "Punto",
      direccion: "",
      latitud: -39.2,
      longitud: -72.1,
      capacidad: 1,
      seguridad_nivel: 1,
      tiempo_aprox_pie: 1,
      ocupado: false,
    })).toContain("map_action=pano");
  });

  it("no crea enlaces externos para coordenadas inválidas", async () => {
    vi.resetModules();
    vi.doMock("@/lib/demo-data", () => ({
      DEMO_PUNTOS_ENCUENTRO: [{
        id: "invalid-point",
        nombre: "Punto inválido",
        direccion: "Sin coordenadas confiables",
        latitud: Number.NaN,
        longitud: -72.1,
        capacidad: 1,
        seguridad_nivel: 1,
        tiempo_aprox_pie: 1,
        ocupado: false,
      }],
      DEMO_ZONAS_EXCLUSION: [],
    }));

    const { default: InteractiveMapInvalid } = await import("@/components/interactive-map");
    render(<InteractiveMapInvalid />);
    await waitFor(() => expect(screen.getByText("Punto inválido")).toBeInTheDocument());

    const navigation = screen.getByText("Navegar").closest("a");
    const map = screen.getByText("Ver mapa").closest("a");
    const streetView = screen.getByText("Ver RA").closest("a");
    expect(navigation).toHaveAttribute("aria-disabled", "true");
    expect(navigation).not.toHaveAttribute("href");
    expect(map).toHaveAttribute("aria-disabled", "true");
    expect(map).not.toHaveAttribute("href");
    expect(streetView).toHaveAttribute("aria-disabled", "true");
    expect(streetView).not.toHaveAttribute("href");

    vi.doUnmock("@/lib/demo-data");
  });

  it("respeta prefers-reduced-motion al centrar un punto", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const user = userEvent.setup();
    render(<InteractiveMap />);
    await waitFor(() => expect(screen.getByText(/ubicaciones/)).toBeInTheDocument());

    const pointButton = screen.getAllByRole("button").find((button) =>
      button.textContent?.includes("a pie")
    );
    await user.click(pointButton!);
    await waitFor(() =>
      expect(leaflet._map.setView).toHaveBeenCalledWith(
        expect.any(Array),
        14,
        { animate: false }
      )
    );
  });

  it("muestra error y no consulta Supabase en full mode sin base configurada", async () => {
    appConfigMock.demoMode = false;
    render(<InteractiveMap />);
    expect(await screen.findByText(/Mapa demo disponible sin Supabase/)).toBeInTheDocument();
  });

  it("muestra empty state cuando no hay puntos", async () => {
    vi.resetModules();
    vi.doMock("@/lib/demo-data", () => ({
      DEMO_PUNTOS_ENCUENTRO: [],
      DEMO_ZONAS_EXCLUSION: [],
    }));
    const { default: InteractiveMapEmpty } = await import("@/components/interactive-map");
    render(<InteractiveMapEmpty />);
    expect(await screen.findByText("Sin puntos registrados")).toBeInTheDocument();
    vi.doUnmock("@/lib/demo-data");
  });
});
