# Apply progress — `volcan-data-operability`

Fecha de aplicación local: 2026-08-16.

## Cerrado localmente

- Ficha GVP curada con fuente/enlace/fecha y sin parámetros de monitoreo inventados.
- Estado con stale >7 días, disclaimer oficial y fallback `sin datos oficiales disponibles`.
- Esquema idempotente extendido a datos de detección, procedencia GIS y consentimiento/RLS.
- RPC de alerta con URL/fecha obligatorias; el trigger conserva esos campos en `logs_sistema`.
- Detector Deno con deduplicación, notificación Resend/webhook y prohibición explícita de escribir `alertas_volcan`.
- Admin panel, mapa, login OTP y páginas legales adaptados.
- 40 archivos de test / 170 tests locales verdes; coverage Node/React mantiene los floors del repo después de excluir el runtime Deno, que tiene contrato estático separado.

## Bloqueado por evidencia externa

- Ejecutar `scripts/init.sql` en el proyecto Supabase real y verificar las nuevas tablas/columnas con `pnpm doctor`.
- Desplegar `vulcan-detect`, cargar secretos y activar `cron.schedule`; hacer una ejecución de prueba sin mutar la alerta.
- Obtener respuesta OIRS y capas `.shp/.kmz` oficiales del Visor para reemplazar los puntos `por_confirmar`.
- Configurar proveedor Phone/SMS, contacto legal público, rotación de secretos y E2E OTP/RLS/realtime/smoke público.

## Regla de publicación

Hasta cerrar esos bloqueos, Vulcania no debe declararse `100% operativa`: el código y los contratos están preparados, pero la salud del backend, el schedule y la fuente GIS siguen siendo gates independientes.
