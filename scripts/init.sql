-- =====================================
-- VULCANIA - VOLCANO MONITORING SYSTEM
-- =====================================

-- =====================================
-- 1. CREATE DATABASE STRUCTURE
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

-- Crear tabla de logs del sistema
CREATE TABLE logs_sistema (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tabla VARCHAR(100) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    registro_id TEXT NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 2. CREATE INDEXES
-- =====================================

CREATE INDEX idx_alertas_volcan_fecha ON alertas_volcan(ultima_actualizacion DESC);
CREATE INDEX idx_avisos_comunidad_fecha ON avisos_comunidad(fecha_creacion DESC);
CREATE INDEX idx_mensajes_chat_fecha ON mensajes_chat(fecha_envio DESC);
CREATE INDEX idx_mensajes_chat_usuarios ON mensajes_chat(emisor_id, receptor_id);
CREATE INDEX idx_recomendaciones_nivel_orden ON recomendaciones_nivel(nivel, orden);
CREATE INDEX idx_puntos_encuentro_ubicacion ON puntos_encuentro(latitud, longitud);
CREATE INDEX idx_puntos_encuentro_ocupado ON puntos_encuentro(ocupado);

-- =====================================
-- 3. CREATE FUNCTIONS
-- =====================================

-- Función para cambiar rápidamente el nivel de alerta
CREATE OR REPLACE FUNCTION cambiar_nivel_alerta(nuevo_nivel VARCHAR(20))
RETURNS VOID AS $$
DECLARE
    volcan_id_var UUID;
    parametros_id_var UUID;
    nuevos_parametros RECORD;
BEGIN
    -- Obtener el ID del volcán
    SELECT id INTO volcan_id_var FROM informacion_volcan LIMIT 1;

    -- Generar parámetros según el nivel
    CASE nuevo_nivel
        WHEN 'verde' THEN
            nuevos_parametros := (
                floor(random() * 20 + 5)::INTEGER,                    -- sismos_24h: 5-25
                (floor(random() * 100 + 700) || '°C')::VARCHAR(20),   -- temperatura: 700-800°C
                (floor(random() * 500 + 800) || ' ton/día')::VARCHAR(30), -- emision_so2: 800-1300
                (round((random() * 1 + 0.5)::numeric, 1) || ' cm/mes')::VARCHAR(20) -- deformacion: 0.5-1.5
            );
        WHEN 'amarillo' THEN
            nuevos_parametros := (
                floor(random() * 30 + 30)::INTEGER,                   -- sismos_24h: 30-60
                (floor(random() * 150 + 800) || '°C')::VARCHAR(20),   -- temperatura: 800-950°C
                (floor(random() * 800 + 1000) || ' ton/día')::VARCHAR(30), -- emision_so2: 1000-1800
                (round((random() * 2 + 1.5)::numeric, 1) || ' cm/mes')::VARCHAR(20) -- deformacion: 1.5-3.5
            );
        WHEN 'naranja' THEN
            nuevos_parametros := (
                floor(random() * 50 + 60)::INTEGER,                   -- sismos_24h: 60-110
                (floor(random() * 200 + 950) || '°C')::VARCHAR(20),   -- temperatura: 950-1150°C
                (floor(random() * 1500 + 1800) || ' ton/día')::VARCHAR(30), -- emision_so2: 1800-3300
                (round((random() * 3 + 3)::numeric, 1) || ' cm/mes')::VARCHAR(20) -- deformacion: 3-6
            );
        WHEN 'rojo' THEN
            nuevos_parametros := (
                floor(random() * 100 + 100)::INTEGER,                 -- sismos_24h: 100-200
                (floor(random() * 300 + 1100) || '°C')::VARCHAR(20),  -- temperatura: 1100-1400°C
                (floor(random() * 5000 + 3000) || ' ton/día')::VARCHAR(30), -- emision_so2: 3000-8000
                (round((random() * 5 + 5)::numeric, 1) || ' cm/mes')::VARCHAR(20) -- deformacion: 5-10
            );
        ELSE
            RAISE EXCEPTION 'Nivel de alerta no válido: %', nuevo_nivel;
    END CASE;

    -- Insertar nuevos parámetros
    INSERT INTO parametros_volcan (sismos_24h, temperatura_crater, emision_so2, deformacion)
    VALUES (nuevos_parametros.f1, nuevos_parametros.f2, nuevos_parametros.f3, nuevos_parametros.f4)
    RETURNING id INTO parametros_id_var;

    -- Insertar nueva alerta
    INSERT INTO alertas_volcan (nivel_alerta, descripcion, parametros_id, volcan_id)
    VALUES (
        nuevo_nivel,
        CASE nuevo_nivel
            WHEN 'verde' THEN 'Actividad volcánica normal. Parámetros dentro de los rangos esperados. Monitoreo rutinario activo.'
            WHEN 'amarillo' THEN 'Actividad volcánica moderada. Se registra actividad sísmica constante y emisiones de gases. Temperatura del cráter en aumento. Monitoreo continuo activo.'
            WHEN 'naranja' THEN 'Actividad volcánica alta. Incremento significativo en todos los parámetros. Posible escalamiento a emergencia. Evacuación preventiva recomendada.'
            WHEN 'rojo' THEN '🚨 EMERGENCIA VOLCÁNICA 🚨 Erupción inminente o en curso. Evacuación inmediata obligatoria. Peligro extremo para la población.'
        END,
        parametros_id_var,
        volcan_id_var
    );

    RAISE NOTICE 'Nivel de alerta cambiado a: %', nuevo_nivel;
END;
$$ LANGUAGE plpgsql;

-- Función para cambiar estado de un punto específico
CREATE OR REPLACE FUNCTION cambiar_estado_punto_encuentro(punto_id UUID, nuevo_estado BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE puntos_encuentro
    SET ocupado = nuevo_estado
    WHERE id = punto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Punto de encuentro no encontrado con ID: %', punto_id;
    END IF;

    RAISE NOTICE 'Punto % actualizado a estado ocupado: %', punto_id, nuevo_estado;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estado de todos los puntos
CREATE OR REPLACE FUNCTION obtener_estado_puntos()
RETURNS TABLE(
    id UUID,
    nombre VARCHAR(255),
    capacidad INTEGER,
    ocupado BOOLEAN,
    estado_texto VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pe.id,
        pe.nombre,
        pe.capacidad,
        pe.ocupado,
        CASE
            WHEN pe.ocupado THEN 'LLENO'
            ELSE 'DISPONIBLE'
        END as estado_texto
    FROM puntos_encuentro pe
    ORDER BY pe.nombre;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar todos los puntos como disponibles (reset)
CREATE OR REPLACE FUNCTION resetear_puntos_encuentro()
RETURNS VOID AS $$
DECLARE
    puntos_actualizados INTEGER;
BEGIN
    UPDATE puntos_encuentro SET ocupado = FALSE;
    GET DIAGNOSTICS puntos_actualizados = ROW_COUNT;

    RAISE NOTICE 'Se resetearon % puntos de encuentro a estado disponible', puntos_actualizados;
END;
$$ LANGUAGE plpgsql;

-- Función para log de cambios en puntos de encuentro
CREATE OR REPLACE FUNCTION log_cambio_estado_punto()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo hacer log si el estado de ocupado cambió
    IF OLD.ocupado IS DISTINCT FROM NEW.ocupado THEN
        INSERT INTO logs_sistema (
            tabla,
            accion,
            registro_id,
            datos_anteriores,
            datos_nuevos,
            fecha_cambio
        ) VALUES (
            'puntos_encuentro',
            'UPDATE',
            NEW.id::TEXT,
            jsonb_build_object('ocupado', OLD.ocupado),
            jsonb_build_object('ocupado', NEW.ocupado),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 4. CREATE TRIGGERS
-- =====================================

-- Trigger para log de cambios en puntos de encuentro
DROP TRIGGER IF EXISTS trigger_log_cambio_estado_punto ON puntos_encuentro;
CREATE TRIGGER trigger_log_cambio_estado_punto
    AFTER UPDATE ON puntos_encuentro
    FOR EACH ROW
    EXECUTE FUNCTION log_cambio_estado_punto();

-- =====================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================

-- Habilitar RLS en puntos_encuentro
ALTER TABLE puntos_encuentro ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
DROP POLICY IF EXISTS "Allow read access to puntos_encuentro" ON puntos_encuentro;
CREATE POLICY "Allow read access to puntos_encuentro"
ON puntos_encuentro FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow admin updates on puntos_encuentro" ON puntos_encuentro;
CREATE POLICY "Allow admin updates on puntos_encuentro"
ON puntos_encuentro FOR UPDATE
USING (true);

-- =====================================
-- 6. INSERT INITIAL DATA
-- =====================================

-- Insertar información del volcán
INSERT INTO informacion_volcan (nombre, codigo, altura_msnm, latitud, longitud, descripcion) VALUES
('Villarrica', 'VIL', 2847, -39.4167, -71.9333, 'Volcán activo ubicado en la Región de la Araucanía, Chile');

-- Insertar configuraciones de niveles de alerta
INSERT INTO configuraciones_nivel (nivel, color, text_color, bg_gradient, icon_name, label, descripcion_corta, urgencia, pulse_color) VALUES
('verde', 'bg-green-600', 'text-white', 'from-green-900/30 to-green-900/10', 'Shield', 'NORMAL', 'Actividad volcánica normal', 'baja', 'shadow-green-500/50'),
('amarillo', 'bg-yellow-600', 'text-white', 'from-yellow-900/30 to-yellow-900/10', 'Activity', 'PRECAUCIÓN', 'Actividad volcánica elevada', 'media', 'shadow-yellow-500/50'),
('naranja', 'bg-orange-600', 'text-white', 'from-orange-900/30 to-orange-900/10', 'TrendingUp', 'ALERTA', 'Actividad volcánica alta', 'alta', 'shadow-orange-500/70'),
('rojo', 'bg-red-600', 'text-white', 'from-red-900/30 to-red-900/10', 'AlertTriangle', 'EMERGENCIA', 'Erupción inminente o en curso', 'crítica', 'shadow-red-500/80');

-- Insertar parámetros actuales del volcán
INSERT INTO parametros_volcan (sismos_24h, temperatura_crater, emision_so2, deformacion) VALUES
(45, '850°C', '1,200 ton/día', '2.3 cm/mes');

-- Insertar alerta actual del volcán
INSERT INTO alertas_volcan (nivel_alerta, descripcion, parametros_id, volcan_id) VALUES
('amarillo', 'Actividad volcánica moderada. Se registra actividad sísmica constante y emisiones de gases. Temperatura del cráter en aumento. Monitoreo continuo activo.',
(SELECT id FROM parametros_volcan LIMIT 1),
(SELECT id FROM informacion_volcan LIMIT 1));

-- Insertar recomendaciones por nivel
INSERT INTO recomendaciones_nivel (nivel, recomendacion, orden) VALUES
-- Verde
('verde', 'Mantenerse informado sobre la actividad volcánica', 1),
('verde', 'Revisar planes de emergencia familiares', 2),
('verde', 'Conocer las rutas de evacuación', 3),
-- Amarillo
('amarillo', 'Mantenerse informado sobre la evolución de la actividad volcánica', 1),
('amarillo', 'Revisar y actualizar planes de evacuación familiares', 2),
('amarillo', 'Tener preparado kit de emergencia', 3),
('amarillo', 'No acercarse al cráter del volcán', 4),
-- Naranja
('naranja', 'EVACUAR INMEDIATAMENTE si se encuentra en zona de riesgo', 1),
('naranja', 'Dirigirse al punto de encuentro más cercano', 2),
('naranja', 'Mantener comunicación con familiares y vecinos', 3),
('naranja', 'Seguir las instrucciones de las autoridades', 4),
('naranja', 'Tener preparado kit de emergencia y documentos importantes', 5),
-- Rojo
('rojo', 'EVACUACIÓN INMEDIATA Y OBLIGATORIA', 1),
('rojo', 'Alejarse inmediatamente de la zona de peligro', 2),
('rojo', 'Seguir estrictamente las instrucciones de emergencia', 3),
('rojo', 'Mantener comunicación con autoridades', 4),
('rojo', 'No regresar hasta que las autoridades lo autoricen', 5);

-- Insertar zonas de exclusión por nivel
INSERT INTO zonas_exclusion (nivel_alerta, radio_km, descripcion) VALUES
('verde', 3, 'Zona de exclusión de 3 km alrededor del cráter'),
('amarillo', 3, 'Zona de exclusión de 3 km alrededor del cráter'),
('naranja', 8, 'Zona de exclusión ampliada a 8 km alrededor del cráter'),
('rojo', 15, 'Zona de exclusión crítica de 15 km alrededor del cráter');

-- Insertar acciones requeridas por nivel
INSERT INTO acciones_requeridas (nivel_alerta, evacuar_zona_riesgo, activar_red_comunitaria, revisar_rutas_evacuacion, preparar_kit_emergencia) VALUES
('verde', FALSE, FALSE, FALSE, FALSE),
('amarillo', FALSE, FALSE, TRUE, TRUE),
('naranja', TRUE, TRUE, TRUE, TRUE),
('rojo', TRUE, TRUE, TRUE, TRUE);

-- Insertar datos de ejemplo para usuarios
INSERT INTO usuarios (nombre, telefono) VALUES
('María González', '+56912345678'),
('Carlos Muñoz', '+56987654321'),
('Ana Pérez', '+56911111111'),
('Juan Martínez', '+56922222222'),
('Claudia Soto', '+56933333333');

-- Insertar puntos de encuentro
INSERT INTO puntos_encuentro
(nombre, direccion, latitud, longitud, capacidad, seguridad_nivel, tiempo_aprox_pie, ocupado) VALUES
('Mirador Puente Pellaifa', 'Puente Pellaifa, camino a Coñaripe', -39.28835, -72.21967, 150, 4, 30, FALSE),
('Agrupación Mujeres Huincul Zomo \"Milimili\"', 'Sector Milimili, Pucón', -39.52940, -72.05500, 120, 3, 45, FALSE),
('Familia Cheuquepán Palo Blanco', 'Sector Cheuquepán–Palo Blanco, Pucón', -39.52940, -72.05885, 80, 3, 40, FALSE),
('Cementerio Pucura', 'Sector Pucura, Pucón', -39.51390, -72.03170, 200, 4, 35, FALSE),
('Familia Lefinao', 'Félix Lefinao, Pucón', -39.51390, -72.07660, 75, 3, 50, FALSE),
('Poly Pinilla Challupen Bajo', 'Challupén Bajo, Pucón', -39.30950, -72.15920, 80, 3, 55, FALSE),
('Sede Ambrosio', 'Sector Ambrosio, Pucón', -39.32000, -72.17000, 100, 3, 60, FALSE),
('Punolef', 'Sector Punolef, Coñaripe/Pucón', -39.33000, -72.14000, 70, 2, 65, FALSE),
('Escuela Alihuén', 'Challupén, comuna Villarrica', -39.35000, -72.14000, 60, 3, 70, FALSE),
('Ensenada Cabañas Norma Punulef', 'Ensenada, Lican Ray', -39.31500, -72.20000, 120, 4, 75, FALSE),
('Cementerio Putabla Predio Renato Vallejos', 'Sector Putabla, Pucón', -39.50800, -72.06000, 100, 3, 80, FALSE),
('Voipir Seco Predio Hugo Vera', 'Voipir Seco alto, Pucón', -39.31000, -72.03500, 70, 2, 85, FALSE),
('Voipir Seco Predio Kolping', 'Voipir Seco alto, Pucón', -39.31200, -72.03700, 70, 2, 90, FALSE),
('Huincacara Sur Predio Juana Montecinos', 'Sector Huincacara Sur, Villarrica', -39.29500, -72.20000, 80, 3, 95, FALSE),
('Huincacara Norte Cerro El Pirao', 'Cerro El Pirao, Huincacara Norte, Villarrica', -39.29000, -72.19500, 60, 3, 100, FALSE),
('Loncotraro - Helipuerto Hotel Park Lake', 'Hotel Park Lake, Loncotraro, Pucón', -39.31050, -72.03020, 120, 4, 105, FALSE),
('Los Riscos', 'Sector Los Riscos, Pucón', -39.28000, -72.00000, 100, 3, 110, FALSE),
('Candelaria', 'Camino Villarrica-Pucón, sector Candelaria', -39.27500, -72.01000, 80, 3, 115, FALSE),
('Los Calabozos', 'Sector Los Calabozos, Pucón', -39.28500, -71.99000, 90, 3, 120, FALSE),
('Península', 'Península Pucón (entre Río Pucon y Lago Villarrica)', -39.27000, -71.97000, 150, 4, 125, FALSE),
('Escuela Quelhue Quelhue Alto', 'Escuela Quelhue, sector Quelhue Alto, Pucón', -39.26153, -71.92032, 80, 3, 130, FALSE),
('Mirador Camino al Volcán', 'Camino Pucón–Caburgua, km aproximado con vista al volcán', -39.24500, -71.90000, 100, 4, 135, FALSE),
('Familia Ñanculipe', 'Sector Ñanculipe, Pucón', -39.30000, -72.05000, 60, 2, 140, FALSE),
('Pino Huacho Predio Pedro Vásquez', 'Sector Pino Huacho, Pucón', -39.28000, -72.02000, 70, 3, 145, FALSE),
('Escuela Estadio Cudico', 'Sector Cudico, Pucón', -39.30000, -72.04000, 90, 3, 150, FALSE),
('Hincacara Sur Iglesia Pentecostal Calfutúe', 'Iglesia Pentecostal Calfutúe, Hincacara Sur', -39.29000, -72.19000, 80, 3, 155, FALSE),
('Conquil Predio Julio Bustos', 'Sector Conquil, predio Julio Bustos, Villarrica', -39.29500, -72.18500, 70, 3, 160, FALSE),
('Estrella Blanca Predio Carmen San Martín', 'Sector Estrella Blanca, Loncotraro Alto', -39.30000, -72.17000, 90, 4, 165, FALSE),
('Loncotraro Alto Country Pucón', 'Entrada Country Pucón, Loncotraro Alto', -39.30200, -72.16500, 100, 4, 170, FALSE),
('Piedra Amarilla Club de Huasos', 'Sector Piedra Amarilla, Club de Huasos', -39.31000, -72.15000, 110, 4, 175, FALSE),
('Cerdúo 1', 'Sector Cerdúo, Pucón', -39.29050, -72.14050, 60, 2, 180, FALSE),
('Cerdúo 2', 'Sector Cerdúo, Pucón', -39.29100, -72.14100, 60, 2, 185, FALSE),
('Palguín', 'Sector Palguín, Pucón', -39.29550, -72.14550, 80, 3, 190, FALSE);

-- Insertar avisos de la comunidad
INSERT INTO avisos_comunidad (usuario_id, mensaje) VALUES
((SELECT id FROM usuarios WHERE nombre = 'María González'), 'Todo tranquilo por sector centro de Pucón'),
((SELECT id FROM usuarios WHERE nombre = 'Carlos Muñoz'), 'Veo mucha actividad en el volcán desde mi casa'),
((SELECT id FROM usuarios WHERE nombre = 'Ana Pérez'), 'Familia segura, nos dirigimos al punto de encuentro'),
((SELECT id FROM usuarios WHERE nombre = 'Juan Martínez'), 'Ruta hacia Temuco despejada, sin problemas de tráfico'),
((SELECT id FROM usuarios WHERE nombre = 'Claudia Soto'), 'Punto de encuentro Estadio Municipal con espacio disponible');

-- Insertar algunos mensajes de chat de ejemplo
INSERT INTO mensajes_chat (emisor_id, receptor_id, mensaje) VALUES
((SELECT id FROM usuarios WHERE nombre = 'María González'), (SELECT id FROM usuarios WHERE nombre = 'Carlos Muñoz'), 'Hola Carlos, ¿cómo está la situación por tu sector?'),
((SELECT id FROM usuarios WHERE nombre = 'Carlos Muñoz'), (SELECT id FROM usuarios WHERE nombre = 'María González'), 'Hola María, todo tranquilo por acá. ¿Y por el centro?'),
((SELECT id FROM usuarios WHERE nombre = 'Ana Pérez'), (SELECT id FROM usuarios WHERE nombre = 'Juan Martínez'), 'Juan, ¿sabes si el punto de encuentro del estadio está operativo?'),
((SELECT id FROM usuarios WHERE nombre = 'Juan Martínez'), (SELECT id FROM usuarios WHERE nombre = 'Ana Pérez'), 'Sí Ana, acabo de pasar y está funcionando normalmente');

-- =====================================
-- 7. VERIFICATION
-- =====================================

DO $$
DECLARE
    total_puntos INTEGER;
    puntos_disponibles INTEGER;
    puntos_ocupados INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_puntos FROM puntos_encuentro;
    SELECT COUNT(*) INTO puntos_disponibles FROM puntos_encuentro WHERE ocupado = FALSE;
    SELECT COUNT(*) INTO puntos_ocupados FROM puntos_encuentro WHERE ocupado = TRUE;

    RAISE NOTICE '=== BASE DE DATOS INICIALIZADA EXITOSAMENTE ===';
    RAISE NOTICE 'Total de puntos de encuentro: %', total_puntos;
    RAISE NOTICE 'Puntos disponibles: %', puntos_disponibles;
    RAISE NOTICE 'Puntos ocupados: %', puntos_ocupados;
    RAISE NOTICE '=============================================';
END $$;
