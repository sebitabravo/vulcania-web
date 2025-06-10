-- ===============================================
-- VULCANIA - SCRIPT PARA SIMULAR CAMBIOS DE ALERTA
-- Funciones para cambiar el nivel de alerta del volcán
-- ===============================================

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

-- ===============================================
-- COMANDOS RÁPIDOS PARA CAMBIAR ALERTAS
-- ===============================================

-- Cambiar a nivel VERDE (Normal)
-- SELECT cambiar_nivel_alerta('verde');

-- Cambiar a nivel AMARILLO (Precaución)
-- SELECT cambiar_nivel_alerta('amarillo');

-- Cambiar a nivel NARANJA (Alerta)
-- SELECT cambiar_nivel_alerta('naranja');

-- Cambiar a nivel ROJO (Emergencia)
-- SELECT cambiar_nivel_alerta('rojo');

-- ===============================================
-- CONSULTAS ÚTILES PARA MONITOREO
-- ===============================================

-- Ver la alerta actual
/*
SELECT
    a.nivel_alerta,
    a.descripcion,
    a.fecha_creacion,
    p.sismos_24h,
    p.temperatura_crater,
    p.emision_so2,
    p.deformacion
FROM alertas_volcan a
JOIN parametros_volcan p ON a.parametros_id = p.id
ORDER BY a.fecha_creacion DESC
LIMIT 1;
*/

-- Ver historial de alertas
/*
SELECT
    nivel_alerta,
    descripcion,
    fecha_creacion
FROM alertas_volcan
ORDER BY fecha_creacion DESC
LIMIT 10;
*/

-- Limpiar historial de alertas (opcional)
/*
DELETE FROM alertas_volcan WHERE fecha_creacion < NOW() - INTERVAL '1 day';
DELETE FROM parametros_volcan WHERE fecha_creacion < NOW() - INTERVAL '1 day';
*/

-- ===============================================
-- FUNCIONES PARA GESTIÓN DE PUNTOS DE ENCUENTRO
-- ===============================================

-- Función para marcar un punto como lleno/ocupado
CREATE OR REPLACE FUNCTION cambiar_estado_punto_encuentro(punto_id UUID, nuevo_estado BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE puntos_encuentro
    SET ocupado = nuevo_estado
    WHERE id = punto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Punto de encuentro no encontrado con ID: %', punto_id;
    END IF;
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
BEGIN
    UPDATE puntos_encuentro SET ocupado = FALSE;
END;
$$ LANGUAGE plpgsql;
