import type { AlertaVolcan, AvisoComunidad, PuntoEncuentro, Usuario } from "@/lib/supabase";

const now = new Date().toISOString();

export const DEMO_USUARIO: Usuario = {
  id: "demo-user",
  nombre: "Demo",
  telefono: "+56 9 8765 4321",
  fecha_creacion: now,
};

export const DEMO_ALERTA: AlertaVolcan = {
  id: "demo-alerta",
  nivel_alerta: "naranja",
  descripcion:
    "Modo demo sin backend: monitoreo simulado activo para el Volcán Villarrica.",
  ultima_actualizacion: now,
  parametros_id: "demo-parametros",
  volcan_id: "demo-volcan",
};

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
  },
];

export const DEMO_AVISOS: AvisoComunidad[] = [
  {
    id: "aviso-1",
    usuario_id: "demo-user",
    mensaje: "Sistema en modo demo offline activo. Información simulada.",
    fecha_creacion: now,
    estado: "activo",
    usuarios: DEMO_USUARIO,
  },
  {
    id: "aviso-2",
    usuario_id: "demo-maria",
    mensaje: "Ruta principal despejada en Pucón centro.",
    fecha_creacion: now,
    estado: "activo",
    usuarios: {
      id: "demo-maria",
      nombre: "María González",
      telefono: "+56 9 1234 5678",
      fecha_creacion: now,
    },
  },
];

