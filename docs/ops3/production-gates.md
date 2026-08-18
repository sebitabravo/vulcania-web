# OPS3 — gates de producción

## Decisión de infraestructura

- **Free:** desarrollo, pruebas y demo; no usar como garantía de monitoreo 24/7.
- **Pro:** evaluar al activar monitoreo continuo, porque el proyecto Free puede pausarse por inactividad. El precio de proveedores debe revisarse en el dashboard el día de contratación.
- **Detector:** 6 h, pero solo después de desplegar `vulcan-detect`, configurar un canal de notificación y verificar el job.

## Checklist antes de declarar `100% operativo`

- [ ] Ejecutar `scripts/init.sql` en la base real y correr `pnpm doctor`.
- [ ] Confirmar las cuatro publicaciones Realtime y las 15 tablas nuevas/extendidas.
- [ ] Desplegar `supabase/functions/vulcan-detect` con secretos fuera del repositorio.
- [ ] Activar `cron.schedule('vulcan-detect-every-6h', ...)` y registrar evidencia de una ejecución.
- [ ] Verificar que una detección llega al operador y no cambia `alertas_volcan`.
- [ ] Configurar Phone/SMS y comprobar OTP real, RLS user/operator/admin y baja SMS.
- [ ] Obtener y archivar respuesta OIRS/capas GIS; importar solo con atribución `oficial`.
- [ ] Configurar `NEXT_PUBLIC_PRIVACY_CONTACT` con el responsable real.
- [ ] Rotar cualquier secreto que haya aparecido en sesiones o logs y actualizar Vercel.
- [ ] Ejecutar smoke público final y conservar fecha, URL, commit y resultado.

La app puede compilar y pasar tests sin que estos gates estén cerrados. Esa separación es intencional y evita declarar operatividad por evidencia solo local.
