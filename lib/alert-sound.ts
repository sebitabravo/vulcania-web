import type { AlertLevel } from "@/lib/alert-levels";
import { logger } from "@/lib/logger";

let sharedContext: AudioContext | null = null;
let activeStop: (() => void) | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedContext) return sharedContext;

  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  sharedContext = new AudioContextConstructor();
  return sharedContext;
}

export async function unlockAlertAudio(): Promise<boolean> {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === "suspended") await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.01);
    return true;
  } catch {
    logger.warn("No se pudo desbloquear el audio de alerta.");
    return false;
  }
}

function playPattern(context: AudioContext, level: AlertLevel): void {
  const frequencies = level === "rojo" ? [880, 1320, 880, 1320] : [660, 880, 1040];
  const gap = level === "rojo" ? 0.22 : 0.38;
  const now = context.currentTime;

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = now + index * gap;
    const endAt = startAt + 0.16;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt);
  });
}

/** Starts at most one repeating sequence and returns its cleanup function. */
export function startAlertSound(level: "naranja" | "rojo"): () => void {
  stopAlertSound();
  const context = getAudioContext();
  if (!context) return () => undefined;

  let stopped = false;
  void context.resume().then(() => {
    if (!stopped) playPattern(context, level);
  }).catch(() => logger.warn("No se pudo iniciar el sonido de alerta."));
  const interval = window.setInterval(() => {
    if (context.state === "running") playPattern(context, level);
  }, level === "rojo" ? 2_000 : 3_500);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(interval);
    if (activeStop === stop) activeStop = null;
  };
  activeStop = stop;
  return stop;
}

export function stopAlertSound(): void {
  activeStop?.();
  activeStop = null;
}
