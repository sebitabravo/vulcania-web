import { createClient } from "@supabase/supabase-js"

// Verificar si estamos en desarrollo
const isDevelopment = process.env.NODE_ENV === 'development'

// URLs por defecto para desarrollo (reemplaza con tus valores reales)
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co"
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key"

// En desarrollo, usar valores mock si no están configurados
if (isDevelopment && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn("⚠️  Variables de entorno de Supabase no configuradas. Usando valores mock para desarrollo.")
  supabaseUrl = "https://demo.supabase.co"
  supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para las tablas
export interface Usuario {
  id: string
  nombre: string
  telefono: string
  fecha_creacion: string
}

export interface AlertaVolcan {
  id: string
  nivel_alerta: "verde" | "amarillo" | "naranja" | "rojo"
  descripcion: string
  ultima_actualizacion: string
  parametros_id?: string
  volcan_id?: string
}

export interface ParametrosVolcan {
  id: string
  sismos_24h: number
  temperatura_crater: string
  emision_so2: string
  deformacion: string
  fecha_actualizacion: string
}

export interface ConfiguracionNivel {
  id: string
  nivel: "verde" | "amarillo" | "naranja" | "rojo"
  color: string
  text_color: string
  bg_gradient: string
  icon_name: string
  label: string
  descripcion_corta: string
  urgencia: string
  pulse_color: string
}

export interface RecomendacionNivel {
  id: string
  nivel: string
  recomendacion: string
  orden: number
}

export interface UbicacionSimulada {
  id: string
  nombre: string
  latitud: number
  longitud: number
  descripcion?: string
}

export interface ZonaExclusion {
  id: string
  nivel_alerta: string
  radio_km: number
  descripcion: string
}

export interface AccionRequerida {
  id: string
  nivel_alerta: string
  evacuar_zona_riesgo: boolean
  activar_red_comunitaria: boolean
  revisar_rutas_evacuacion: boolean
  preparar_kit_emergencia: boolean
}

export interface InformacionVolcan {
  id: string
  nombre: string
  codigo: string
  altura_msnm: number
  latitud: number
  longitud: number
  descripcion?: string
  activo: boolean
}

export interface PuntoEncuentro {
  id: string
  nombre: string
  direccion: string
  latitud: number
  longitud: number
  capacidad: number
  seguridad_nivel: number
  tiempo_aprox_pie: number
  ocupado: boolean
}

export interface RutaEvacuacion {
  id: string
  nombre_ruta: string
  descripcion: string
  coordenadas_geojson: {
    type: 'LineString'
    coordinates: number[][]
  }
}

export interface AvisoComunidad {
  id: string
  usuario_id: string
  mensaje: string
  fecha_creacion: string
  estado: string
  usuarios?: Usuario
}

export interface MensajeChat {
  id: string
  emisor_id: string
  receptor_id: string
  mensaje: string
  fecha_envio: string
  emisor?: Usuario
  receptor?: Usuario
}
