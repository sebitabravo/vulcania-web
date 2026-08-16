import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockAudioContext {
  static instances: MockAudioContext[] = [];
  state = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator = vi.fn(() => ({
    type: "",
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }));

  constructor() {
    MockAudioContext.instances.push(this);
  }
}

/** La última instancia creada por getAudioContext(). */
function lastContext(): MockAudioContext {
  return MockAudioContext.instances.at(-1)!;
}

/**
 * El singleton sharedContext vive en el estado del módulo; cada test usa una
 * instancia fresca del módulo para que la secuencia anterior no contamine.
 */
async function loadAlertSound() {
  vi.resetModules();
  return await import("@/lib/alert-sound");
}

describe("alert-sound", () => {
  beforeEach(() => {
    MockAudioContext.instances = [];
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("desbloquea el audio y devuelve true con un contexto listo", async () => {
    const { unlockAlertAudio } = await loadAlertSound();
    await expect(unlockAlertAudio()).resolves.toBe(true);
  });

  it("no crea sonido sin AudioContext disponible", async () => {
    vi.stubGlobal("AudioContext", undefined);
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext =
      undefined;
    const { unlockAlertAudio } = await loadAlertSound();
    await expect(unlockAlertAudio()).resolves.toBe(false);
  });

  it("inicia una secuencia repetitiva y su cleanup la detiene", async () => {
    const { startAlertSound } = await loadAlertSound();
    const stop = startAlertSound("rojo");
    expect(stop).toBeTypeOf("function");
    const context = lastContext();

    // state "running": el primer patrón se toca al resolver resume().
    await vi.advanceTimersByTimeAsync(0);
    const callsBefore = context.createOscillator.mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(2_000);
    const callsDuring = context.createOscillator.mock.calls.length;
    expect(callsDuring).toBeGreaterThan(callsBefore);

    stop();
    const callsAtStop = context.createOscillator.mock.calls.length;
    await vi.advanceTimersByTimeAsync(4_000);
    expect(context.createOscillator.mock.calls.length).toBe(callsAtStop);
  });

  it("startAlertSound reemplaza el sonido activo anterior sin doble intervalo", async () => {
    const { startAlertSound, stopAlertSound } = await loadAlertSound();
    const first = startAlertSound("naranja");
    const second = startAlertSound("rojo");
    first();
    second();
    stopAlertSound();
    expect(() => startAlertSound("naranja")).not.toThrow();
  });
});
