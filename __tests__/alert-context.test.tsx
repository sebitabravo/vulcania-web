import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlertProvider, ALERT_FALLBACK_POLL_MS, useAlert } from "@/contexts/alert-context";

const { appConfigMock, queryMock, channelMock, supabaseMock } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);

  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
  channel.on.mockReturnValue(channel);

  return {
    appConfigMock: { demoMode: false },
    queryMock: query,
    channelMock: channel,
    supabaseMock: {
      from: vi.fn(() => query),
      channel: vi.fn(() => channel),
    },
  };
});

vi.mock("@/lib/app-config", () => ({ APP_CONFIG: appConfigMock }));
vi.mock("@/lib/supabase", () => ({ supabase: supabaseMock }));

function Probe() {
  const { alerta, hasError, realtimeStatus, refresh } = useAlert();
  return (
    <div>
      <output data-testid="alert-id">{alerta?.id ?? "none"}</output>
      <output data-testid="error">{String(hasError)}</output>
      <output data-testid="status">{realtimeStatus}</output>
      <button type="button" onClick={() => void refresh()}>Refresh</button>
    </div>
  );
}

const ALERT_ONE = {
  id: "alert-one",
  nivel_alerta: "verde" as const,
  descripcion: "Lectura inicial",
  ultima_actualizacion: "2026-08-16T18:00:00.000Z",
};

const ALERT_TWO = {
  ...ALERT_ONE,
  id: "alert-two",
  descripcion: "Lectura posterior",
};

describe("AlertProvider", () => {
  let subscribeStatus: ((status: string) => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    appConfigMock.demoMode = false;
    queryMock.maybeSingle.mockResolvedValue({ data: ALERT_ONE, error: null });
    channelMock.subscribe.mockImplementation((callback: (status: string) => void) => {
      subscribeStatus = callback;
      return channelMock;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function finishInitialLoad() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("alert-id")).toHaveTextContent("alert-one");
  }

  it("mantiene la última alerta y refresca cada 30 s cuando Realtime no está confirmado", async () => {
    render(<AlertProvider><Probe /></AlertProvider>);
    await finishInitialLoad();

    await act(async () => {
      subscribeStatus?.("CHANNEL_ERROR");
    });
    queryMock.maybeSingle.mockResolvedValueOnce({ data: ALERT_TWO, error: null });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ALERT_FALLBACK_POLL_MS);
    });

    expect(screen.getByTestId("alert-id")).toHaveTextContent("alert-two");
    expect(screen.getByTestId("status")).toHaveTextContent("channel_error");
    expect(queryMock.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("deduplica dos refresh mientras la consulta anterior sigue en vuelo", async () => {
    let resolveQuery: ((value: { data: typeof ALERT_ONE; error: null }) => void) | undefined;
    queryMock.maybeSingle.mockImplementationOnce(() => new Promise((resolve) => { resolveQuery = resolve; }));
    render(<AlertProvider><Probe /></AlertProvider>);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await act(async () => {
      resolveQuery?.({ data: ALERT_ONE, error: null });
      await Promise.resolve();
    });

    expect(queryMock.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("marca error sin borrar una alerta válida si un refresh falla", async () => {
    render(<AlertProvider><Probe /></AlertProvider>);
    await finishInitialLoad();

    queryMock.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error("network") });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("error")).toHaveTextContent("true");
    expect(screen.getByTestId("alert-id")).toHaveTextContent("alert-one");
  });
});
