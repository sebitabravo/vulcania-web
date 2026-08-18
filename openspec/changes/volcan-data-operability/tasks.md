# Tareas — Operabilidad de datos volcánicos

## Fase 1 — Datos del volcán (gap 3, más barato)

- [x] TASK_1: Actualizar `informacion_volcan` con la ficha GVP verificable del Villarrica (2.847 m, -39.42/-71.93, estratovolcán, 152 periodos confirmados, periodo 2014-2025 VEI 3, riesgos) vía seed/migración idempotente en `scripts/init.sql`. La auditoría previa que decía +82/VEI 2 quedó corregida por discrepancia de fuente.
- [x] TASK_2: Actualizar la UI de `volcano-status-header` para mostrar fuente + fecha de verificación + disclaimer "no oficial" en el estado.
- [x] TASK_3: Mostrar "sin datos oficiales disponibles" en los parámetros de monitoreo vacíos (`parametros_volcan`), sin inventar valores.
- [x] TASK_4: Tests de ficha, fuente, ausencia de parámetros y fecha de verificación en `__tests__/volcano-facts.test.tsx` y `__tests__/official-sources.test.ts`.

## Fase 2 — Pipeline híbrido de alerta (gap 1)

- [x] TASK_5: Agregar a `scripts/init.sql` tabla `detecciones`, columnas de fuente/publicación/verificación en `alertas_volcan`, campos de ficha y RPC de tres argumentos; el trigger serializa fuente y fechas en `logs_sistema`.
- [x] TASK_6: Crear `supabase/functions/vulcan-detect/index.ts`: detecta PDFs REAV/RAV y cambios GVP, guarda fingerprints y notifica por Resend o webhook. No escribe `alertas_volcan`.
- [ ] TASK_7: La función tiene schedule `cron.schedule` documentado y comentado en `scripts/init.sql`; queda pendiente activarlo en Supabase con secretos reales y prueba E2E.
- [x] TASK_8: Extender el admin panel para exigir `fuente_url` y `fecha_publicacion` y persistirlos mediante RPC.
- [x] TASK_9: Stale-marking de más de 7 días en header y ficha; el mapa muestra trazabilidad de zonas/puntos.
- [x] TASK_10: Tests de contrato de schema/RPC, detector y stale-marking; la ejecución real del RPC y log queda para E2E contra Supabase.

## Fase 3 — Zonas seguras con atribución (gap 2)

- [x] TASK_11: Agregar a `scripts/init.sql` columnas `fuente`, `fuente_url`, `documento`, `fecha_fuente`, `trazabilidad` en `puntos_encuentro` y `zonas_exclusion`; migrar seeds a `trazabilidad='por_confirmar'`.
- [x] TASK_12: Mapa (`interactive-map.tsx`) etiqueta trazabilidad y muestra atribución/link en tooltip/card.
- [ ] TASK_13: Gestión oficial (paralela, canal humano): solicitud OIRS a Municipalidad de Pucón / SENAPRED Araucanía por el Plan Comunal de Emergencia; descargar capas del Visor Chile Preparado (.shp/.kmz) de la comuna de Pucón.
- [x] TASK_14: Crear `scripts/import-safety-zones.ts`; valida URL, documento, fecha y trazabilidad antes de usar service role.
- [x] TASK_15: Tests de trazabilidad del mapa/demo y contrato del importador; los datos reales siguen bloqueados hasta OIRS/Visor.

## Fase 4 — Legal y consentimiento

- [x] TASK_16: Agregar a `scripts/init.sql` tablas `consentimientos` y `terminos` (versión, ruta, fecha) + RLS.
- [x] TASK_17: Flujo de registro con checkbox por finalidad + declaración 18+ + aceptación de Términos/Privacidad; el trigger exige metadatos mínimos y el cliente persiste timestamp/versión.
- [x] TASK_18: Crear `/terminos` y `/privacidad` con naturaleza referencial, finalidades, ARCO, retención, contacto configurable y menores.
- [x] TASK_19: Opt-in SMS separado y revocable con `SmsAlertConsent`; activación queda deshabilitada hasta configurar proveedor.
- [x] TASK_20: Tests del flujo de consentimiento y contrato SQL; la prueba de creación atómica requiere E2E Supabase.

## Fase 5 — Operación y despliegue

- [x] TASK_21: Decisión documentada: Free para desarrollo; Pro al pasar monitoreo 24/7 a producción, con precios sujetos a verificación vigente.
- [ ] TASK_22: Habilitar Phone/SMS en Supabase Auth (Authentication → Providers → Phone) + proveedor SMS (Twilio o WhatsApp OTP; opt-in documentado).
- [ ] TASK_23: Rotar secretos expuestos en el transcript de la sesión (SUPABASE_JWT_SECRET, service role, DB password) y actualizar env vars en Vercel.
- [ ] TASK_24: E2E final: OTP real, RLS user/operator/admin, cambio de alerta con fuente, realtime, smoke público de producción.
