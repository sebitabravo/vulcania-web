-- =====================================
-- VULCANIA - VOLCANO MONITORING SYSTEM
-- Database Structure Creation Script
-- =====================================

-- Crear tabla de usuarios
CREATE TABLE usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) UNIQUE NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para información del volcán
CREATE TABLE informacion_volcan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    altura_msnm INTEGER,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- Crear tabla para parámetros del volcán
CREATE TABLE parametros_volcan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sismos_24h INTEGER NOT NULL,
    temperatura_crater VARCHAR(20) NOT NULL,
    emision_so2 VARCHAR(30) NOT NULL,
    deformacion VARCHAR(20) NOT NULL,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para configuraciones de niveles de alerta
CREATE TABLE configuraciones_nivel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nivel VARCHAR(20) NOT NULL UNIQUE CHECK (nivel IN ('verde', 'amarillo', 'naranja', 'rojo')),
    color VARCHAR(20) NOT NULL,
    text_color VARCHAR(20) NOT NULL,
    bg_gradient VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    label VARCHAR(50) NOT NULL,
    descripcion_corta VARCHAR(100) NOT NULL,
    urgencia VARCHAR(20) NOT NULL,
    pulse_color VARCHAR(50) NOT NULL
);

-- Crear tabla de alertas del volcán
CREATE TABLE alertas_volcan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nivel_alerta VARCHAR(20) NOT NULL CHECK (nivel_alerta IN ('verde', 'amarillo', 'naranja', 'rojo')),
    descripcion TEXT NOT NULL,
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parametros_id UUID REFERENCES parametros_volcan(id),
    volcan_id UUID REFERENCES informacion_volcan(id)
);

-- Crear tabla para recomendaciones por nivel
CREATE TABLE recomendaciones_nivel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nivel VARCHAR(20) NOT NULL REFERENCES configuraciones_nivel(nivel),
    recomendacion TEXT NOT NULL,
    orden INTEGER NOT NULL
);

-- Crear tabla para zonas de exclusión
CREATE TABLE zonas_exclusion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nivel_alerta VARCHAR(20) NOT NULL REFERENCES configuraciones_nivel(nivel),
    radio_km INTEGER NOT NULL,
    descripcion TEXT NOT NULL
);

-- Crear tabla para acciones requeridas por nivel
CREATE TABLE acciones_requeridas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nivel_alerta VARCHAR(20) NOT NULL REFERENCES configuraciones_nivel(nivel),
    evacuar_zona_riesgo BOOLEAN DEFAULT FALSE,
    activar_red_comunitaria BOOLEAN DEFAULT FALSE,
    revisar_rutas_evacuacion BOOLEAN DEFAULT FALSE,
    preparar_kit_emergencia BOOLEAN DEFAULT FALSE
);

-- Crear tabla de puntos de encuentro
CREATE TABLE puntos_encuentro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    capacidad INTEGER NOT NULL,
    seguridad_nivel INTEGER NOT NULL CHECK (seguridad_nivel BETWEEN 1 AND 5),
    tiempo_aprox_pie INTEGER NOT NULL, -- en minutos
    ocupado BOOLEAN DEFAULT FALSE
);

-- Crear tabla de rutas de evacuación
CREATE TABLE rutas_evacuacion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_ruta VARCHAR(255) NOT NULL,
    descripcion TEXT,
    coordenadas_geojson JSONB NOT NULL
);

-- Crear tabla para ubicaciones simuladas (para el demo)
CREATE TABLE ubicaciones_simuladas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    descripcion TEXT
);

-- Crear tabla de avisos de la comunidad
CREATE TABLE avisos_comunidad (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

-- Crear tabla de mensajes de chat
CREATE TABLE mensajes_chat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    emisor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    receptor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================

CREATE INDEX idx_alertas_volcan_fecha ON alertas_volcan(ultima_actualizacion DESC);
CREATE INDEX idx_avisos_comunidad_fecha ON avisos_comunidad(fecha_creacion DESC);
CREATE INDEX idx_mensajes_chat_fecha ON mensajes_chat(fecha_envio DESC);
CREATE INDEX idx_mensajes_chat_usuarios ON mensajes_chat(emisor_id, receptor_id);
CREATE INDEX idx_recomendaciones_nivel_orden ON recomendaciones_nivel(nivel, orden);
CREATE INDEX idx_puntos_encuentro_ubicacion ON puntos_encuentro(latitud, longitud);
