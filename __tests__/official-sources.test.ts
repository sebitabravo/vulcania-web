import { describe, expect, it } from "vitest";
import { OFFICIAL_DISCLAIMER, OFFICIAL_SOURCES, isSafeHttpUrl, traceabilityLabel } from "@/lib/official-sources";
import { isVerificationStale } from "@/lib/date-utils";

describe("fuentes oficiales y envejecimiento", () => {
  it("mantiene enlaces oficiales y disclaimer explícito", () => {
    expect(OFFICIAL_SOURCES.sernageominAlerts.url).toMatch(/^https:\/\//);
    expect(OFFICIAL_SOURCES.chilePreparado.url).toContain("visor");
    expect(OFFICIAL_DISCLAIMER).toMatch(/no es fuente oficial/i);
  });

  it("acepta solo fuentes http(s) y etiqueta trazabilidad", () => {
    expect(isSafeHttpUrl("https://example.com/report.pdf")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(traceabilityLabel("oficial")).toBe("Fuente oficial");
    expect(traceabilityLabel("comunitaria")).toBe("Fuente comunitaria");
    expect(traceabilityLabel("unknown")).toBe("Por confirmar");
  });

  it("marca la verificación con más de siete días como stale", () => {
    const now = Date.parse("2026-08-16T00:00:00.000Z");
    expect(isVerificationStale("2026-08-09T00:00:00.000Z", now)).toBe(false);
    expect(isVerificationStale("2026-08-08T23:59:59.000Z", now)).toBe(true);
    expect(isVerificationStale(undefined, now)).toBe(true);
  });
});
