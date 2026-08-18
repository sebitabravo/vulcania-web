export const OFFICIAL_SOURCES = {
  sernageominAlerts: {
    label: "SERNAGEOMIN · Alertas volcánicas",
    url: "https://www.sernageomin.cl/alertas-volcanicas/",
  },
  senapredVillarrica: {
    label: "SENAPRED · Villarrica",
    url: "https://senapred.cl/ubicacion_alerta/comuna-de-villarrica/",
  },
  chilePreparado: {
    label: "SENAPRED · Visor Chile Preparado",
    url: "https://www.senapred.cl/visor-preparado/",
  },
  gvpVillarrica: {
    label: "Smithsonian GVP · Villarrica 357120",
    url: "https://volcano.si.edu/volcano.cfm?vn=357120",
  },
} as const;

export const OFFICIAL_DISCLAIMER =
  "Vulcania no es fuente oficial. Ante una emergencia, consulta SERNAGEOMIN, SENAPRED y el SAE.";

export function isSafeHttpUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export function traceabilityLabel(value: string | null | undefined): string {
  switch (value) {
    case "oficial":
      return "Fuente oficial";
    case "comunitaria":
      return "Fuente comunitaria";
    default:
      return "Por confirmar";
  }
}
