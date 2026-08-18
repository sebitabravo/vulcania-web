import type {
  AlertaVolcan,
  AvisoComunidad,
  MensajeChat,
  InformacionVolcan,
  PuntoEncuentro,
  PublicProfile,
  Usuario,
  ZonaExclusion,
} from "@/lib/supabase";
import { isAlertLevel, type AlertLevel } from "@/lib/alert-levels";

const demoPhone = "+56 9 8765 4321";
const DEMO_LEVEL_KEY = "vulcania_demo_alert_level";

export const DEMO_USUARIO: Usuario = {
  id: "demo-user",
  nombre: "Persona demo",
  telefono: demoPhone,
  rol: "user",
  fecha_creacion: new Date().toISOString(),
};

export const DEMO_VOLCAN_INFO: InformacionVolcan = {
  id: "demo-volcan",
  nombre: "Villarrica",
  codigo: "VIL",
  altura_msnm: 2847,
  latitud: -39.42,
  longitud: -71.93,
  descripcion: "Ficha histórica de referencia. Los parámetros de monitoreo en tiempo real no están disponibles en esta demo.",
  tipo_volcan: "Estratovolcán",
  laguna_lava: true,
  erupciones_registradas: 152,
  ultima_erupcion_vei: 3,
  riesgos_principales: "Lava, lahares y caída de tefra.",
  fuente: "Smithsonian Global Volcanism Program",
  fuente_url: "https://volcano.si.edu/volcano.cfm?vn=357120",
  ultima_verificacion: "2026-08-16T00:00:00Z",
  activo: true,
};

export const DEMO_PROFILES: PublicProfile[] = [
  DEMO_USUARIO,
  {
    id: "demo-maria",
    nombre: "María González",
    rol: "user",
    fecha_creacion: new Date().toISOString(),
  },
  {
    id: "demo-carlos",
    nombre: "Carlos Muñoz",
    rol: "user",
    fecha_creacion: new Date().toISOString(),
  },
];

const DEMO_DESCRIPTIONS: Record<AlertLevel, string> = {
  verde: "Actividad volcánica dentro de los parámetros habituales. Monitoreo rutinario activo.",
  amarillo: "Actividad volcánica inestable. Mantente alejado del volcán y sigue los canales oficiales.",
  naranja: "Variación significativa. Revisa tus rutas y prepárate para una posible evacuación.",
  rojo: "Alerta de simulación. Sigue las instrucciones oficiales de evacuación.",
};

export function createDemoAlert(now = new Date().toISOString(), level: AlertLevel = "verde"): AlertaVolcan {
  return {
    id: `demo-alerta-${level}`,
    nivel_alerta: level,
    descripcion: DEMO_DESCRIPTIONS[level],
    fuente: "Simulación local de Vulcania",
    referencia: "DEMO",
    es_simulacion: true,
    ultima_actualizacion: now,
    volcan_id: "demo-volcan",
  };
}

export const DEMO_ALERTA = createDemoAlert();

export function getDemoAlert(): AlertaVolcan {
  if (typeof window === "undefined") return createDemoAlert();
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(DEMO_LEVEL_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return createDemoAlert(new Date().toISOString(), stored && isAlertLevel(stored) ? stored : "verde");
}

export function setDemoAlertLevel(level: AlertLevel): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DEMO_LEVEL_KEY, level);
  } catch {
    // The in-memory event still updates the current tab when storage is denied.
  }
  window.dispatchEvent(new CustomEvent("vulcania:demo-alert", { detail: level }));
}

export const DEMO_PUNTOS_ENCUENTRO: PuntoEncuentro[] = [
  {
    id: "punto-1",
    nombre: "Estadio Pucón",
    direccion: "Centro de Pucón",
    latitud: -39.2796,
    longitud: -71.9725,
    capacidad: 500,
    seguridad_nivel: 4,
    tiempo_aprox_pie: 20,
    ocupado: false,
    fuente: "Datos demo históricos de Vulcania",
    fuente_url: "https://www.senapred.cl/visor-preparado/",
    documento: "Fuente oficial pendiente de confirmación",
    trazabilidad: "por_confirmar",
  },
  {
    id: "punto-2",
    nombre: "Escuela Quelhue",
    direccion: "Sector Quelhue",
    latitud: -39.2575,
    longitud: -71.9177,
    capacidad: 250,
    seguridad_nivel: 3,
    tiempo_aprox_pie: 35,
    ocupado: false,
    fuente: "Datos demo históricos de Vulcania",
    fuente_url: "https://www.senapred.cl/visor-preparado/",
    documento: "Fuente oficial pendiente de confirmación",
    trazabilidad: "por_confirmar",
  },
  {
    id: "punto-3",
    nombre: "Club de Huasos",
    direccion: "Piedra Amarilla",
    latitud: -39.3541,
    longitud: -72.0429,
    capacidad: 300,
    seguridad_nivel: 4,
    tiempo_aprox_pie: 45,
    ocupado: true,
    fuente: "Datos demo históricos de Vulcania",
    fuente_url: "https://www.senapred.cl/visor-preparado/",
    documento: "Fuente oficial pendiente de confirmación",
    trazabilidad: "por_confirmar",
  },
];

export const DEMO_ZONAS_EXCLUSION: ZonaExclusion[] = [
  { id: "zona-verde", nivel_alerta: "verde", radio_km: 3, descripcion: "Zona técnica referencial de 3 km.", fuente: "Visor Chile Preparado / pendiente de verificación", fuente_url: "https://www.senapred.cl/visor-preparado/", documento: "Plano oficial en actualización.", trazabilidad: "por_confirmar" },
  { id: "zona-amarilla", nivel_alerta: "amarillo", radio_km: 3, descripcion: "Zona técnica referencial de 3 km.", fuente: "Visor Chile Preparado / pendiente de verificación", fuente_url: "https://www.senapred.cl/visor-preparado/", documento: "Plano oficial en actualización.", trazabilidad: "por_confirmar" },
  { id: "zona-naranja", nivel_alerta: "naranja", radio_km: 8, descripcion: "Zona ampliada referencial de 8 km.", fuente: "Visor Chile Preparado / pendiente de verificación", fuente_url: "https://www.senapred.cl/visor-preparado/", documento: "Plano oficial en actualización.", trazabilidad: "por_confirmar" },
  { id: "zona-roja", nivel_alerta: "rojo", radio_km: 15, descripcion: "Zona crítica referencial de 15 km.", fuente: "Visor Chile Preparado / pendiente de verificación", fuente_url: "https://www.senapred.cl/visor-preparado/", documento: "Plano oficial en actualización.", trazabilidad: "por_confirmar" },
];

export function createDemoCommunity(now = Date.now()): AvisoComunidad[] {
  return [
    {
      id: "aviso-1",
      usuario_id: "demo-user",
      autor_nombre: "Persona demo",
      mensaje: "Sistema en modo demo offline activo. Información simulada.",
      fecha_creacion: new Date(now - 4 * 60_000).toISOString(),
      estado: "activo",
    },
    {
      id: "aviso-2",
      usuario_id: "demo-maria",
      autor_nombre: "María González",
      mensaje: "Ruta principal despejada en Pucón centro.",
      fecha_creacion: new Date(now - 18 * 60_000).toISOString(),
      estado: "activo",
    },
  ];
}

export const DEMO_AVISOS = createDemoCommunity();

let demoCommunityState: AvisoComunidad[] | null = null;

export function getDemoCommunity(): AvisoComunidad[] {
  if (!demoCommunityState) demoCommunityState = createDemoCommunity();
  return demoCommunityState;
}

export function addDemoCommunity(aviso: AvisoComunidad): AvisoComunidad[] {
  demoCommunityState = [aviso, ...getDemoCommunity()];
  return demoCommunityState;
}

export function createDemoMessages(now = Date.now()): MensajeChat[] {
  return [
    {
      id: "demo-msg-1",
      emisor_id: "demo-maria",
      receptor_id: "demo-user",
      mensaje: "¿Cómo está el estado del sistema?",
      fecha_envio: new Date(now - 10 * 60_000).toISOString(),
      leido: false,
    },
    {
      id: "demo-msg-2",
      emisor_id: "demo-user",
      receptor_id: "demo-maria",
      mensaje: "Todo operativo. La alerta demo está rotulada como simulación.",
      fecha_envio: new Date(now - 8 * 60_000).toISOString(),
      leido: true,
    },
    {
      id: "demo-msg-3",
      emisor_id: "demo-carlos",
      receptor_id: "demo-user",
      mensaje: "Gracias. Revisaré el mapa de puntos de encuentro.",
      fecha_envio: new Date(now - 35 * 60_000).toISOString(),
      leido: true,
    },
  ];
}

let demoMessagesState: MensajeChat[] | null = null;

export function getDemoMessages(): MensajeChat[] {
  if (!demoMessagesState) demoMessagesState = createDemoMessages();
  return demoMessagesState;
}

export function addDemoMessage(message: MensajeChat): MensajeChat[] {
  demoMessagesState = [...getDemoMessages(), message];
  return demoMessagesState;
}

export function markDemoConversationRead(currentId: string, otherId: string): MensajeChat[] {
  const readAt = new Date().toISOString();
  demoMessagesState = getDemoMessages().map((message) => {
    const isConversation =
      (message.emisor_id === currentId && message.receptor_id === otherId) ||
      (message.emisor_id === otherId && message.receptor_id === currentId);
    if (!isConversation || message.receptor_id !== currentId || message.leido) return message;
    return { ...message, leido: true, fecha_lectura: readAt };
  });
  return demoMessagesState;
}
