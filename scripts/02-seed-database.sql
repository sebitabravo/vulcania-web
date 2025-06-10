-- =====================================
-- VULCANIA - VOLCANO MONITORING SYSTEM
-- Database Initial Data Script
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
(nombre, direccion, latitud, longitud, capacidad, seguridad_nivel, ocupado) VALUES
('Mirador Puente Pellaifa', 'Puente Pellaifa, camino a Coñaripe', -39.28835, -72.21967, 150, 4, FALSE),
('Agrupación Mujeres Huincul Zomo \"Milimili\"', 'Sector Milimili, Pucón', -39.52940, -72.05500, 120, 3, FALSE),
('Familia Cheuquepán Palo Blanco', 'Sector Cheuquepán–Palo Blanco, Pucón', -39.52940, -72.05885, 80, 3, FALSE),
('Cementerio Pucura', 'Sector Pucura, Pucón', -39.51390, -72.03170, 200, 4, FALSE),
('Familia Lefinao', 'Félix Lefinao, Pucón', -39.51390, -72.07660, 75, 3, FALSE);
('Poly Pinilla Challupen Bajo', 'Challupén Bajo, Pucón', -39.30950, -72.15920, 80, 3, FALSE),
('Sede Ambrosio', 'Sector Ambrosio, Pucón', -39.32000, -72.17000, 100, 3, FALSE),
('Punolef', 'Sector Punolef, Coñaripe/Pucón', -39.33000, -72.14000, 70, 2, FALSE),
('Escuela Alihuén', 'Challupén, comuna Villarrica', -39.35000, -72.14000, 60, 3, FALSE),
('Ensenada Cabañas Norma Punulef', 'Ensenada, Lican Ray', -39.31500, -72.20000, 120, 4, FALSE);
('Cementerio Putabla Predio Renato Vallejos', 'Sector Putabla, Pucón', -39.50800, -72.06000, 100, 3, FALSE),
('Voipir Seco Predio Hugo Vera', 'Voipir Seco alto, Pucón', -39.31000, -72.03500, 70, 2, FALSE),
('Voipir Seco Predio Kolping', 'Voipir Seco alto, Pucón', -39.31200, -72.03700, 70, 2, FALSE),
('Huincacara Sur Predio Juana Montecinos', 'Sector Huincacara Sur, Villarrica', -39.29500, -72.20000, 80, 3, FALSE),
('Huincacara Norte Cerro El Pirao', 'Cerro El Pirao, Huincacara Norte, Villarrica', -39.29000, -72.19500, 60, 3, FALSE);
('Loncotraro - Helipuerto Hotel Park Lake', 'Hotel Park Lake, Loncotraro, Pucón', -39.31050, -72.03020, 120, 4, FALSE),
('Los Riscos', 'Sector Los Riscos, Pucón', -39.28000, -72.00000, 100, 3, FALSE),
('Candelaria', 'Camino Villarrica-Pucón, sector Candelaria', -39.27500, -72.01000, 80, 3, FALSE),
('Los Calabozos', 'Sector Los Calabozos, Pucón', -39.28500, -71.99000, 90, 3, FALSE),
('Península', 'Península Pucón (entre Río Pucon y Lago Villarrica)', -39.27000, -71.97000, 150, 4, FALSE);
('Escuela Quelhue Quelhue Alto', 'Escuela Quelhue, sector Quelhue Alto, Pucón', -39.26153, -71.92032, 80, 3, FALSE),
('Mirador Camino al Volcán', 'Camino Pucón–Caburgua, km aproximado con vista al volcán', -39.24500, -71.90000, 100, 4, FALSE),
('Familia Ñanculipe', 'Sector Ñanculipe, Pucón', -39.30000, -72.05000, 60, 2, FALSE),
('Pino Huacho Predio Pedro Vásquez', 'Sector Pino Huacho, Pucón', -39.28000, -72.02000, 70, 3, FALSE),
('Escuela Estadio Cudico', 'Sector Cudico, Pucón', -39.30000, -72.04000, 90, 3, FALSE);
('Hincacara Sur Iglesia Pentecostal Calfutúe', 'Iglesia Pentecostal Calfutúe, Hincacara Sur', -39.29000, -72.19000, 80, 3, FALSE),
('Conquil Predio Julio Bustos', 'Sector Conquil, predio Julio Bustos, Villarrica', -39.29500, -72.18500, 70, 3, FALSE),
('Estrella Blanca Predio Carmen San Martín', 'Sector Estrella Blanca, Loncotraro Alto', -39.30000, -72.17000, 90, 4, FALSE),
('Loncotraro Alto Country Pucón', 'Entrada Country Pucón, Loncotraro Alto', -39.30200, -72.16500, 100, 4, FALSE),
('Piedra Amarilla Club de Huasos', 'Sector Piedra Amarilla, Club de Huasos', -39.31000, -72.15000, 110, 4, FALSE);
('Cerdúo 1', 'Sector Cerdúo, Pucón', -39.29050, -72.14050, 60, 2, FALSE),
('Cerdúo 2', 'Sector Cerdúo, Pucón', -39.29100, -72.14100, 60, 2, FALSE),
('Palguín', 'Sector Palguín, Pucón', -39.29550, -72.14550, 80, 3, FALSE);

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
