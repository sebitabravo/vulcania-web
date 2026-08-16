import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { unlockAlertAudio } from "@/lib/alert-sound";

vi.mock("@/lib/alert-sound", () => ({
  unlockAlertAudio: vi.fn(),
}));

const mockUnlock = vi.mocked(unlockAlertAudio);

/**
 * El módulo audio-unlock guarda `unlocked` en su estado y los listeners viven
 * en window; cada test carga una instancia fresca y registra su cleanup para
 * no dejar listeners activos que contaminen al siguiente test.
 */
let activeCleanups: Array<() => void> = [];

async function loadAudioUnlock() {
  vi.resetModules();
  const { setupAudioUnlock } = await import("@/lib/audio-unlock");
  const cleanup = setupAudioUnlock();
  activeCleanups.push(cleanup);
  return cleanup;
}

async function pressKeyOnWindow() {
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
  });
}

async function tapPointerOnWindow() {
  await act(async () => {
    window.dispatchEvent(new Event("pointerdown"));
  });
}

describe("audio-unlock", () => {
  beforeEach(() => {
    activeCleanups = [];
    mockUnlock.mockReset();
    mockUnlock.mockResolvedValue(true);
  });

  afterEach(() => {
    activeCleanups.forEach((cleanup) => cleanup());
    activeCleanups = [];
    mockUnlock.mockReset();
  });

  it("desbloquea con pointerdown", async () => {
    await loadAudioUnlock();
    await tapPointerOnWindow();
    expect(mockUnlock).toHaveBeenCalledTimes(1);
  });

  it("desbloquea con keydown", async () => {
    await loadAudioUnlock();
    await pressKeyOnWindow();
    expect(mockUnlock).toHaveBeenCalledTimes(1);
  });

  it("remueve ambos listeners tras el primer desbloqueo exitoso", async () => {
    await loadAudioUnlock();
    await pressKeyOnWindow();
    expect(mockUnlock).toHaveBeenCalledTimes(1);

    await tapPointerOnWindow();
    await pressKeyOnWindow();
    expect(mockUnlock).toHaveBeenCalledTimes(1);
  });

  it("mantiene los listeners si el desbloqueo falla", async () => {
    mockUnlock.mockResolvedValue(false);
    await loadAudioUnlock();

    await tapPointerOnWindow();
    await tapPointerOnWindow();
    expect(mockUnlock).toHaveBeenCalledTimes(2);
  });

  it("el cleanup remueve los listeners", async () => {
    const cleanup = await loadAudioUnlock();
    cleanup();
    await tapPointerOnWindow();
    expect(mockUnlock).not.toHaveBeenCalled();
  });
});
