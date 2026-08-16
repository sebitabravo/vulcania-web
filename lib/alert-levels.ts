import {
  AlertTriangle,
  Flame,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from "lucide-react";

export type AlertLevel = "verde" | "amarillo" | "naranja" | "rojo";

export interface AlertLevelConfig {
  level: AlertLevel;
  label: string;
  shortLabel: string;
  description: string;
  action: string;
  icon: LucideIcon;
  /** Classes are kept here so every surface uses the same semantic mapping. */
  badgeClass: string;
  panelClass: string;
  iconClass: string;
  patternClass: string;
  accentColor: string;
  isCritical: boolean;
}

export const ALERT_LEVELS: Record<AlertLevel, AlertLevelConfig> = {
  verde: {
    level: "verde",
    label: "Alerta Verde",
    shortLabel: "Verde",
    description: "Actividad dentro de los parámetros habituales.",
    action: "Mantente informado y revisa tu plan familiar.",
    icon: ShieldCheck,
    badgeClass:
      "border-emerald-400/40 bg-emerald-400/15 text-emerald-300",
    panelClass: "border-emerald-400/25 bg-emerald-400/[0.06]",
    iconClass: "text-emerald-300",
    patternClass: "",
    accentColor: "#10b981",
    isCritical: false,
  },
  amarillo: {
    level: "amarillo",
    label: "Alerta Amarilla",
    shortLabel: "Amarilla",
    description: "Actividad inestable sobre el nivel de base.",
    action: "Mantente alejado del volcán y sigue los canales oficiales.",
    icon: AlertTriangle,
    badgeClass: "border-yellow-300/50 bg-yellow-300/15 text-yellow-200",
    panelClass: "border-yellow-300/30 bg-yellow-300/[0.06]",
    iconClass: "text-yellow-200",
    patternClass: "",
    accentColor: "#eab308",
    isCritical: false,
  },
  naranja: {
    level: "naranja",
    label: "Alerta Naranja",
    shortLabel: "Naranja",
    description: "Variación significativa; el proceso puede escalar.",
    action: "Revisa las rutas de evacuación y sigue a las autoridades.",
    icon: Flame,
    badgeClass: "border-orange-300/50 bg-orange-300/15 text-orange-200",
    panelClass:
      "border-orange-300/35 bg-orange-300/[0.07] status-stripes",
    iconClass: "text-orange-200",
    patternClass: "status-stripes",
    accentColor: "#f97316",
    isCritical: true,
  },
  rojo: {
    level: "rojo",
    label: "Alerta Roja",
    shortLabel: "Roja",
    description: "Erupción mayor inminente o en curso.",
    action: "Sigue las instrucciones de evacuación de las autoridades.",
    icon: Siren,
    badgeClass: "border-red-300/55 bg-red-400/20 text-red-100",
    panelClass: "border-red-300/50 bg-red-400/[0.09] status-stripes",
    iconClass: "text-red-200",
    patternClass: "status-stripes",
    accentColor: "#ef4444",
    isCritical: true,
  },
};

export function isAlertLevel(value: string): value is AlertLevel {
  return Object.prototype.hasOwnProperty.call(ALERT_LEVELS, value);
}

export function isCriticalAlert(level: string): level is "naranja" | "rojo" {
  return isAlertLevel(level) && ALERT_LEVELS[level].isCritical;
}

export function getAlertLevelConfig(level: string): AlertLevelConfig {
  return isAlertLevel(level) ? ALERT_LEVELS[level] : ALERT_LEVELS.verde;
}
