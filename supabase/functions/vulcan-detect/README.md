# `vulcan-detect`

Detector híbrido para Vulcania. Revisa cada fuente, guarda un fingerprint en
`public.detecciones` y notifica al operador. **Nunca escribe
`public.alertas_volcan` ni cambia el nivel por sí mismo.**

## Secretos requeridos

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DETECTOR_FUNCTION_TOKEN` (recomendado si el scheduler no valida JWT)
- Para correo: `RESEND_API_KEY`, `DETECTOR_OPERATOR_EMAIL` y `DETECTOR_FROM_EMAIL`.
- Alternativa: `DETECTOR_NOTIFICATION_WEBHOOK_URL` para un webhook controlado por el operador.

Si no existe un canal de notificación, la detección queda en estado `error` con
`notification_not_configured`; esto evita presentar el cron como operativo
cuando no puede avisar a nadie.

## Deploy y schedule

Desplegar la función y cargar los secretos con Supabase CLI o Dashboard. Luego
activar el `cron.schedule` comentado al final de `scripts/init.sql`, sustituyendo
el endpoint y el token por secretos reales. La frecuencia definida es cada 6 h.
No se deben pegar claves en SQL versionado.

La función puede ser invocada manualmente con `GET` o `POST` para diagnóstico.
El último paso de producción sigue siendo verificar en Supabase que el job está
activo y que una detección de prueba notifica al operador sin modificar la
alerta vigente.
