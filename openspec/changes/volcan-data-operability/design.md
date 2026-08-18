# Diseño — Operabilidad de datos volcánicos

## Contexto

- Target de despliegue: Supabase en full mode. Este cambio no afirma que el proyecto remoto tenga el schema aplicado ni que RLS, Realtime u OTP estén verificados: después de ejecutar `scripts/init.sql` hay que correr `pnpm doctor` y los smoke/E2E contra el proyecto real.
- La fuente oficial (SERNAGEOMIN) no tiene API; el estado de alerta se publica en PDF REAV/RAV; el GVP (Smithsonian) publica un reporte semanal curado.
- El operador es humano (rol operator/admin en `usuarios`); cambia la alerta desde la consola con `cambiar_nivel_alerta(nuevo_nivel, fuente_url, fecha_publicacion)`.

## Decisiones

### D1 — Detector programado: edge function scheduled de Supabase

**Opción elegida:** Edge function `vulcan-detect` en Supabase, programada con `pg_cron` (scheduled functions: `cron.schedule('vulcan-detect', '0 */6 * * *', $$select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/vulcan-detect', headers := jsonb_build_object('Authorization', 'Bearer ' || ...))$$)`).

**Alternativas:** GitHub Actions scheduled (gratis, pero la lógica queda fuera del proyecto y el secreto de service role viaja a GH); pg_cron + pg_net directo (HTTP limitado); Vercel Cron (no existe en plan Free).

**Consecuencias:** La detección vive junto a la base y el realtime; 4 ejecuciones/día ≈ 120 invocaciones/mes (de 500K incluidas en Free); el plan Free pausa proyectos tras 7 días de inactividad → documentar Pro como requisito de producción 24/7.

**Comportamiento del detector:** GET a `https://www.sernageomin.cl/alertas-volcanicas/` (parsing del listado REAV/RAV, detección de nuevos por nombre/fecha del PDF) y GET a `https://volcano.si.edu/volcano.cfm?vn=357120` (último "Latest Weekly Volcanic Activity Report" mencionando Villarrica). Si hay novedad: inserta en `detecciones` (tabla nueva) y notifica al operador vía correo (resend/email de Supabase) con el enlace. No escribe `alertas_volcan`.

### D2 — Trazabilidad de la alerta: campos fuente en el RPC y UI

**Opción elegida:** Extender `cambiar_nivel_alerta(nuevo_nivel, fuente_url, fecha_publicacion)` para exigir `fuente_url` y `fecha_publicacion` del reporte oficial; el trigger existente (`trigger_log_alert_change`) ya escribe `logs_sistema` — se amplía el log con `datos_nuevos` incluyendo fuente. El admin panel agrega campos obligatorios "URL del reporte" y "Fecha del reporte".

**Alternativas:** Tabla separada `cambios_alertas` (sobre-ingeniería: `logs_sistema` ya cumple); publicar sin fuente (rechazado: requisito REQUIREMENT_5).

**Consecuencias:** Todo cambio queda auditable; la UI del header muestra "Fuente: SERNAGEOMIN · Verificado {fecha}" con enlace.

### D3 — Anti-envejecimiento: stale-marking por `fecha_verificacion`

**Opción elegida:** Nueva columna `ultima_verificacion timestamptz` en `informacion_volcan` (y/o `alertas_volcan` según se modela el estado). El header y el mapa muestran "no verificado" cuando `now() - ultima_verificacion > interval '7 days'`. La verificación la refresca el operador al confirmar (D2) o una tarea de mantenimiento.

**Alternativas:** Borrar el dato viejo (rechazado: perder información); mostrar siempre con fecha sin estado (insuficiente: REQUIREMENT_7 exige marcado explícito).

**Consecuencias:** Un dato viejo visible pero marcado preserva la confianza y la trazabilidad.

### D4 — Atribución de zonas: campos fuente + etiqueta en el mapa

**Opción elegida:** Agregar a `puntos_encuentro` y `zonas_exclusion` los campos `fuente text`, `documento text`, `fecha_fuente date`, `trazabilidad text` ('oficial' | 'por_confirmar' | 'comunitaria'). El mapa (interactive-map.tsx) pinta distinto según `trazabilidad` y muestra la atribución en el tooltip/card. Los puntos demo existentes se migran a `trazabilidad='por_confirmar'`.

**Alternativas:** Mantener el estado actual sin etiquetas (rechazado: riesgo legal CRÍTICO documentado en la auditoría).

**Consecuencias:** El mapa distingue visualmente lo verificado de lo comunitario; la importación oficial (capas `.shp`/`.kmz` del Visor Chile Preparado o respuesta OIRS) se hace por operador con `documento` registrado (REQUIREMENT_11).

### D5 — Consentimiento legal: tabla `consentimientos` + flujo de registro

**Opción elegida:** Nueva tabla `consentimientos (id uuid, usuario_id uuid references usuarios, tipo text, aceptado boolean, version_terminos text, fecha_decision timestamp, fecha_revocacion timestamp)` + tabla `terminos (id, tipo, version, titulo, ruta, fecha_publicacion, activo)`. El registro (login-screen) exige: checkbox separado por finalidad (autenticación/alertas/comunidad), declaración de 18+, enlace a Términos y Privacidad. Cada aceptación se inserta con timestamp y el trigger de alta rechaza metadatos mínimos ausentes.

**Alternativas:** Campo booleano en `usuarios` (insuficiente: sin trazabilidad de qué versión se aceptó); sin consentimiento (rechazado: Ley 19.628 art. 4 y Ley 21.719).

**Consecuencias:** Cumplimiento del checklist legal mínimo (ops3-legal §2); opt-in SMS revocable con mecanismo de baja.

### D6 — Ficha del volcán: seed real con fuentes

**Opción elegida:** Actualizar la fila de `informacion_volcan` (seed de instalación) con los datos GVP verificados (REQUIREMENT_1-2): altura 2.847, coords -39.42/-71.93, descripción curada con fuente. `parametros_volcan` queda sin fila en tiempo real hasta que exista fuente (REQUIREMENT_3); la UI muestra "sin datos oficiales disponibles" para esos campos.

**Alternativas:** Dejar el seed de instalación (rechazado: es el gap 3 sin cerrar); scrapear GVP en runtime (rechazado: 403 anti-bot, datos estáticos no necesitan scrape).

**Consecuencias:** La ficha pasa de "app bonita" a "fuente informativa con trazabilidad" (ceo: prioridad 3, la más barata).

## Modelo de datos resultante

- Nuevas columnas: `puntos_encuentro.{fuente, documento, fecha_fuente, trazabilidad}`, `zonas_exclusion.{fuente, documento, fecha_fuente, trazabilidad}`, `informacion_volcan.ultima_verificacion` (o `alertas_volcan` según dónde viva el estado vigente), `alertas_volcan.fuente_url`, `alertas_volcan.fecha_publicacion`.
- Nuevas tablas: `consentimientos`, `terminos`, `detecciones` (id, tipo_fuente, hash/url, encontrado_en, notificado).
- RPC modificado: `cambiar_nivel_alerta(nuevo_nivel, fuente_url, fecha_publicacion)`.
- Edge function: `supabase/functions/vulcan-detect/index.ts` + schedule pg_cron.
