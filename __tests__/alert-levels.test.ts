import { describe, expect, it } from "vitest";
import {
  ALERT_LEVELS,
  getAlertLevelConfig,
  isAlertLevel,
  isCriticalAlert,
} from "@/lib/alert-levels";

describe("alert-levels", () => {
  it("mantiene las cuatro claves semánticas con configuración completa", () => {
    expect(Object.keys(ALERT_LEVELS)).toEqual(["verde", "amarillo", "naranja", "rojo"]);
    for (const level of Object.values(ALERT_LEVELS)) {
      expect(level.label).toMatch(/^Alerta /);
      expect(level.icon).toBeDefined();
      expect(level.badgeClass).not.toBe("");
    }
  });

  it("reconoce niveles válidos y rechaza valores externos", () => {
    expect(isAlertLevel("verde")).toBe(true);
    expect(isAlertLevel("emergencia")).toBe(false);
    expect(isAlertLevel("toString")).toBe(false);
    expect(getAlertLevelConfig("desconocido")).toBe(ALERT_LEVELS.verde);
  });

  it("solo abre la vía crítica para naranja y rojo", () => {
    expect(isCriticalAlert("verde")).toBe(false);
    expect(isCriticalAlert("amarillo")).toBe(false);
    expect(isCriticalAlert("naranja")).toBe(true);
    expect(isCriticalAlert("rojo")).toBe(true);
  });
});
