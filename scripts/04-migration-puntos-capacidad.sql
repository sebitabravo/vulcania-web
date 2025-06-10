-- =============================================
-- VULCANIA - MIGRACIÓN PARA GESTIÓN DE PUNTOS
-- Agregar funcionalidad de ocupación/capacidad
-- =============================================

-- PASO 1: Agregar campo ocupado a tabla existente
-- Si la tabla ya existe, agregar la columna ocupado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'puntos_encuentro'
        AND column_name = 'ocupado'
    ) THEN
        ALTER TABLE puntos_encuentro
        ADD COLUMN ocupado BOOLEAN DEFAULT FALSE;

        RAISE NOTICE 'Campo ocupado agregado a puntos_encuentro';
    ELSE
        RAISE NOTICE 'Campo ocupado ya existe en puntos_encuentro';
    END IF;
END $$;

-- PASO 2: Asegurar que todos los puntos existentes estén marcados como disponibles
UPDATE puntos_encuentro
SET ocupado = FALSE
WHERE ocupado IS NULL;

-- PASO 3: Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_puntos_encuentro_ocupado
ON puntos_encuentro(ocupado);

-- PASO 4: Crear funciones de gestión (si no existen)

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

-- PASO 5: Crear políticas de seguridad RLS (Row Level Security)

-- Permitir lectura a todos los usuarios autenticados
DROP POLICY IF EXISTS "Allow read access to puntos_encuentro" ON puntos_encuentro;
CREATE POLICY "Allow read access to puntos_encuentro"
ON puntos_encuentro FOR SELECT
USING (true);

-- Permitir actualización solo a administradores (o todos por ahora)
DROP POLICY IF EXISTS "Allow admin updates on puntos_encuentro" ON puntos_encuentro;
CREATE POLICY "Allow admin updates on puntos_encuentro"
ON puntos_encuentro FOR UPDATE
USING (true);

-- PASO 6: Habilitar RLS en la tabla (si no está habilitado)
ALTER TABLE puntos_encuentro ENABLE ROW LEVEL SECURITY;

-- PASO 7: Verificar la migración
DO $$
DECLARE
    total_puntos INTEGER;
    puntos_disponibles INTEGER;
    puntos_ocupados INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_puntos FROM puntos_encuentro;
    SELECT COUNT(*) INTO puntos_disponibles FROM puntos_encuentro WHERE ocupado = FALSE;
    SELECT COUNT(*) INTO puntos_ocupados FROM puntos_encuentro WHERE ocupado = TRUE;

    RAISE NOTICE '=== MIGRACIÓN COMPLETADA ===';
    RAISE NOTICE 'Total de puntos: %', total_puntos;
    RAISE NOTICE 'Puntos disponibles: %', puntos_disponibles;
    RAISE NOTICE 'Puntos ocupados: %', puntos_ocupados;
    RAISE NOTICE '============================';
END $$;

-- PASO 8: Ejemplos de uso

-- Ver estado actual de todos los puntos
-- SELECT * FROM obtener_estado_puntos();

-- Marcar un punto como lleno (ejemplo)
-- SELECT cambiar_estado_punto_encuentro('UUID-DEL-PUNTO', true);

-- Liberar un punto
-- SELECT cambiar_estado_punto_encuentro('UUID-DEL-PUNTO', false);

-- Resetear todos los puntos
-- SELECT resetear_puntos_encuentro();

-- PASO 9: Crear trigger para log de cambios (opcional)
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

-- Crear tabla de logs si no existe (opcional)
CREATE TABLE IF NOT EXISTS logs_sistema (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tabla VARCHAR(100) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    registro_id TEXT NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear trigger (opcional)
DROP TRIGGER IF EXISTS trigger_log_cambio_estado_punto ON puntos_encuentro;
CREATE TRIGGER trigger_log_cambio_estado_punto
    AFTER UPDATE ON puntos_encuentro
    FOR EACH ROW
    EXECUTE FUNCTION log_cambio_estado_punto();

-- MENSAJE FINAL
DO $$
BEGIN
    RAISE NOTICE '🎯 MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '✅ Campo "ocupado" agregado a puntos_encuentro';
    RAISE NOTICE '✅ Funciones de gestión creadas';
    RAISE NOTICE '✅ Políticas de seguridad configuradas';
    RAISE NOTICE '✅ Trigger de logging habilitado';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 La aplicación Vulcania ahora puede gestionar';
    RAISE NOTICE '   la capacidad de puntos de encuentro en tiempo real';
END $$;
