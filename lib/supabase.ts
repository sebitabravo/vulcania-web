import { createClient } from "@supabase/supabase-js"

// Verificar variables de entorno requeridas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validación de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars: string[] = []
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  console.error('❌ Variables de entorno de Supabase no configuradas:', missingVars.join(', '))

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Variables de entorno de Supabase faltantes en producción: ${missingVars.join(', ')}`)
  }
}

// Crear el cliente de Supabase
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Helper para verificar configuración
export const isSupabaseConfigured = () => Boolean(supabase)

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
  leido?: boolean // Campo para marcar mensajes como leídos
  fecha_lectura?: string // Cuándo se leyó el mensaje
  emisor?: Usuario
  receptor?: Usuario
}

// Interfaz para estadísticas de conversación
export interface EstadisticasConversacion {
  usuario: Usuario
  ultimoMensaje?: MensajeChat
  mensajesNoLeidos: number
  fechaUltimaActividad: string
}
