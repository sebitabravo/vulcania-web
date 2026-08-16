import { describe, expect, it, vi } from "vitest";
import {
  formatFreshness,
  formatLocalDateTime,
  formatTime,
  isStale,
} from "@/lib/date-utils";

const NOW = Date.parse("2026-08-16T12:00:00.000Z");

describe("date-utils", () => {
  it("formatea frescura en minutos, horas y días sin valores negativos", () => {
    expect(formatFreshness("2026-08-16T12:00:00.000Z", NOW)).toContain("menos de 1 min");
    expect(formatFreshness("2026-08-16T11:55:00.000Z", NOW)).toContain("5 min");
    expect(formatFreshness("2026-08-16T10:00:00.000Z", NOW)).toContain("2 h");
    expect(formatFreshness("2026-08-14T12:00:00.000Z", NOW)).toContain("2 d");
    expect(formatFreshness("2026-08-16T13:00:00.000Z", NOW)).toContain("menos de 1 min");
  });

  it("maneja fechas inválidas y antigüedad", () => {
    // isStale compara contra Date.now() interno: fijar el reloj lo hace determinista.
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      expect(formatFreshness("no-es-fecha", NOW)).toBe("Antigüedad no disponible");
      expect(formatLocalDateTime("no-es-fecha")).toBe("Fecha no disponible");
      expect(formatTime("no-es-fecha")).toBe("--:--");
      expect(isStale("no-es-fecha")).toBe(true);
      expect(isStale("2026-08-16T11:59:00.000Z", 30)).toBe(false);
      expect(isStale("2026-08-15T10:00:00.000Z", 30)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("produce formatos locales para fechas válidas", () => {
    expect(formatLocalDateTime("2026-08-16T12:00:00.000Z")).not.toBe("Fecha no disponible");
    expect(formatTime("2026-08-16T12:00:00.000Z")).toMatch(/\d{2}:\d{2}/);
  });
});
