import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** The browser client is intentionally absent in offline demo mode. */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = (): boolean => Boolean(supabase);

export type UserRole = "user" | "operator" | "admin";
export type AlertLevel = "verde" | "amarillo" | "naranja" | "rojo";

export interface Usuario {
  id: string;
  nombre: string;
  telefono: string;
  rol?: UserRole;
  fecha_creacion: string;
}

export interface PublicProfile {
  id: string;
  nombre: string;
  rol?: UserRole;
  fecha_creacion?: string;
}

export interface AlertaVolcan {
  id: string;
  nivel_alerta: AlertLevel;
  descripcion: string;
  fuente?: string;
  referencia?: string | null;
  es_simulacion?: boolean;
  ultima_actualizacion: string;
  parametros_id?: string;
  volcan_id?: string;
  informacion_volcan?: Pick<InformacionVolcan, "nombre">;
}

export interface ParametrosVolcan {
  id: string;
  sismos_24h: number;
  temperatura_crater: string;
  emision_so2: string;
  deformacion: string;
  fecha_actualizacion: string;
}

export interface ConfiguracionNivel {
  id: string;
  nivel: AlertLevel;
  color: string;
  text_color: string;
  bg_gradient: string;
  icon_name: string;
  label: string;
  descripcion_corta: string;
  urgencia: string;
  pulse_color: string;
}

export interface RecomendacionNivel {
  id: string;
  nivel: AlertLevel;
  recomendacion: string;
  orden: number;
}

export interface ZonaExclusion {
  id: string;
  nivel_alerta: AlertLevel;
  radio_km: number;
  descripcion: string;
}

export interface AccionRequerida {
  id: string;
  nivel_alerta: AlertLevel;
  evacuar_zona_riesgo: boolean;
  activar_red_comunitaria: boolean;
  revisar_rutas_evacuacion: boolean;
  preparar_kit_emergencia: boolean;
}

export interface InformacionVolcan {
  id: string;
  nombre: string;
  codigo: string;
  altura_msnm: number;
  latitud: number;
  longitud: number;
  descripcion?: string;
  activo: boolean;
}

export interface PuntoEncuentro {
  id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  capacidad: number;
  seguridad_nivel: number;
  tiempo_aprox_pie: number;
  ocupado: boolean;
}

export interface AvisoComunidad {
  id: string;
  usuario_id: string;
  autor_nombre?: string;
  mensaje: string;
  fecha_creacion: string;
  estado: "activo" | "inactivo" | "eliminado" | string;
  usuarios?: PublicProfile;
}

export interface MensajeChat {
  id: string;
  emisor_id: string;
  receptor_id: string;
  mensaje: string;
  fecha_envio: string;
  leido?: boolean;
  fecha_lectura?: string;
  emisor?: PublicProfile;
  receptor?: PublicProfile;
}

export interface EstadisticasConversacion {
  usuario: PublicProfile;
  ultimoMensaje?: MensajeChat;
  mensajesNoLeidos: number;
  fechaUltimaActividad: string;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
