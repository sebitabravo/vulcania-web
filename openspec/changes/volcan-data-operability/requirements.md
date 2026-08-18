# Requisitos — Operabilidad de datos volcánicos

## Datos del volcán

REQUIREMENT_1: La tabla `informacion_volcan` debe contener la ficha real del Villarrica: nombre, código, altura 2.847 m, latitud -39,42, longitud -71,93, tipo estratovolcán, referencia histórica al lago de lava, 152 periodos eruptivos confirmados según la ficha GVP actualmente verificable, periodo eruptivo GVP 2014-2025 con VEI 3 y riesgos de lava/lahares/tefra. El claim heredado de "+82 erupciones" y "VEI 2" no se carga como hecho oficial porque no coincide con la página GVP consultada; si se recupera, debe atribuirse a una fuente separada.

REQUIREMENT_2: La ficha debe exponer la fuente de cada dato con enlace (Smithsonian GVP vn=357120; cualquier corroboración secundaria debe quedar separada y etiquetada) y una fecha de verificación.

REQUIREMENT_3: No se deben publicar parámetros de monitoreo en tiempo real (sismicidad, deformación, SO2) sin una fuente oficial verificable; si no existe fuente, esos campos quedan vacíos o marcados "sin datos oficiales disponibles".

## Pipeline híbrido de alerta

REQUIREMENT_4: Debe existir un detector programado (edge function scheduled o GitHub Actions, cada 4-6 h) que vigile: (a) la página de alertas de SERNAGEOMIN en busca de REAV/RAV nuevos para el Villarrica, y (b) el reporte semanal del GVP. El detector compara contra el último visto y, ante un cambio, notifica al operador SIN publicar nada.

REQUIREMENT_5: El cambio del nivel de alerta (`cambiar_nivel_alerta`) debe quedar registrado en un log de auditoría con: operador, nivel anterior, nivel nuevo, `fuente_url`, `fecha_publicacion` del reporte oficial y `fecha_verificacion` del operador.

REQUIREMENT_6: La UI debe mostrar en todo dato de estado: nivel oficial, "Fuente: SERNAGEOMIN/SENAPRED" con enlace, fecha de última verificación y el disclaimer "Vulcania no es fuente oficial; consulte sernageomin.cl / senapred.cl".

REQUIREMENT_7: Si el estado no se verifica en más de 7 días, la UI debe marcarlo como "no verificado" (anti-envejecimiento), sin eliminarlo.

REQUIREMENT_8: Si la fuente oficial cae o no está disponible, la UI debe mostrar "sin datos oficiales disponibles" con el enlace al canal oficial, y nunca rellenar con datos inventados.

## Zonas seguras

REQUIREMENT_9: Los puntos de encuentro y zonas de exclusión deben llevar atribución (`fuente`, `documento`, `fecha`) y una etiqueta de trazabilidad: "oficial" (SENAPRED/SERNAGEOMIN/municipalidad) o "por confirmar"/"comunitaria".

REQUIREMENT_10: Los puntos actuales sin atribución deben quedar etiquetados como no verificados hasta que se importen datos con fuente (capas del Visor Chile Preparado `.shp`/`.kmz` o respuesta OIRS de la Municipalidad de Pucón).

REQUIREMENT_11: La importación de zonas seguras debe ser una operación del operador con registro del documento fuente, no un scraper automático.

## Legal y consentimiento

REQUIREMENT_12: El registro debe exigir consentimiento expreso y documentado (checkbox separado + timestamp + versión de términos) para: autenticación, alertas y visibilidad del nombre en la comunidad (Ley 19.628 art. 4; compatible Ley 21.719 desde 01-12-2026). La implementación debe rechazar una alta nueva si faltan autenticación, mayoría de edad o versión legal.

REQUIREMENT_13: Deben existir Términos de uso y Política de Privacidad accesibles en el registro y en la app: naturaleza referencial del servicio, finalidades del tratamiento, canal de derechos ARCO, política de retención/borrado y contacto del responsable.

REQUIREMENT_14: Las alertas proactivas por SMS requieren opt-in separado y revocable, con mecanismo de baja visible (requisito contractual Twilio AUP).

REQUIREMENT_15: El registro debe exigir mayoría de edad (18+) y no recopilar datos de menores de 14 años.

REQUIREMENT_16: La app debe mantener visible el canal oficial de emergencia (SAE como alerta real, enlaces a SERNAGEOMIN/SENAPRED) y educar sobre él, sin presentarse como fuente oficial de alerta.
