import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const detector = readFileSync(resolve(process.cwd(), "supabase/functions/vulcan-detect/index.ts"), "utf8");

describe("contrato del detector híbrido", () => {
  it("vigila SERNAGEOMIN y GVP y persiste fingerprints", () => {
    expect(detector).toContain("https://www.sernageomin.cl/alertas-volcanicas/");
    expect(detector).toContain("https://volcano.si.edu/volcano.cfm?vn=357120");
    expect(detector).toContain("detecciones");
    expect(detector).toContain("SHA-256");
  });

  it("notifica al operador y falla de forma visible si no hay canal", () => {
    expect(detector).toContain("DETECTOR_NOTIFICATION_WEBHOOK_URL");
    expect(detector).toContain("RESEND_API_KEY");
    expect(detector).toContain("notification_not_configured");
  });

  it("no puede publicar el nivel de alerta automáticamente", () => {
    expect(detector).not.toContain("alertas_volcan");
    expect(detector).toContain("nunca publica niveles");
  });
});
