# Auditoría Financiera — Ops 3: Costos de operación (cron, SMS OTP, plan Supabase, datos del volcán)

**Proyecto:** vulcania-web (plataforma comunitaria de monitoreo del volcán Villarrica, Pucón, Chile)
**Rol:** cfo-finance
**Fecha de verificación:** 2026-08-16
**Método:** WebFetch sobre documentación oficial (Supabase, Twilio, Meta) y lectura read-only de la página pública de Sernageomin (curl; el sitio institucional no valida certificado TLS). Todas las cifras son las publicadas en las fuentes al día de la verificación; los precios de proveedores pueden cambiar sin aviso.

---

## 1. Cron jobs en Supabase Free (pg_cron y scheduled edge functions)

**1.1** `pg_cron` está disponible en todos los planes de Supabase, incluido el Free. La guía oficial de cron no establece restricción por plan; los únicos límites documentados son operativos: jobs programables "desde cada segundo hasta una vez al año", máximo **8 jobs en ejecución concurrente** y **máximo 10 minutos de duración por job**.
- Fuente: https://supabase.com/docs/guides/cron

**1.2** Costo de un job cada 5–15 minutos en Free: **USD 0**. Cálculo:
- Job cada 5 min = 12 × 24 × 30 = **8.640 ejecuciones/mes**.
- Job cada 15 min = 4 × 24 × 30 = **2.880 ejecuciones/mes**.
- El plan Free incluye **500.000 invocaciones de Edge Functions al mes** (https://supabase.com/pricing). Un job cada 5 min consume ~1,7% de la cuota. El mecanismo (pg_cron + pg_net haciendo `net.http_post` a `/functions/v1/<fn>`) cuenta como invocación estándar; **no hay cargo por job**.
- Fuente: https://supabase.com/docs/guides/functions/schedule-functions

**1.3 — GOTCHA CRÍTICO para un producto de monitoreo 24/7:** Supabase puede pausar proyectos del plan Free tras 7 días de baja actividad ("We may pause applications on the Free Plan that exhibit low activity in a 7-day period"). Si el proyecto se pausa, **los cron jobs y las edge functions dejan de ejecutarse**: el monitoreo se apaga justo en los períodos de calma volcánica. En un producto de alerta de seguridad esto es un riesgo operativo de vida y seguridad, no un detalle de plan.
- Fuente: https://supabase.com/docs/guides/platform/going-into-prod

**1.4** El plan Pro (USD 25/mes) no pausa el proyecto, incluye backups diarios descargables (7 días), soporte por email, 100K MAU, 250 GB egress y **USD 10/mes en crédito de cómputo** (cubre una instancia Micro). Fuente: https://supabase.com/pricing

## 2. SMS para OTP en Chile

**2.1** Proveedores soportados por Supabase Auth para OTP por teléfono: **MessageBird, Twilio, Vonage** y **TextLocal** (este último community-supported). **WhatsApp solo como canal a través de Twilio o Twilio Verify**. Supabase no cobra por el envío; el costo es del proveedor. Limitación integrada: un usuario solo puede solicitar OTP cada 60 s y el código expira a la hora.
- Fuente: https://supabase.com/docs/guides/auth/phone-login

**2.2** **Twilio SMS directo a Chile (+56): USD 0,0797 por segmento** (mensajes >160 caracteres cobran más segmentos); SMS entrante USD 0,0075; pueden aplicarse carrier fees adicionales. Para Chile, la única opción de número listada es **"Clean Mobile Number" a USD 10/mes de arriendo** — costo fijo relevante incluso con 10 SMS/mes.
- Fuente: https://www.twilio.com/en-us/sms/pricing/cl

**2.3** **Twilio Verify** (producto OTP dedicado): **USD 0,05 por verificación exitosa** + tarifa de canal SMS del país (≈ USD 0,0797 a Chile) → **~USD 0,13 por OTP completado**.
- Fuente: https://www.twilio.com/en-us/verify/pricing

**2.4** **WhatsApp Business API (Twilio) a Chile:** fee Twilio de **USD 0,005 por mensaje** + fee de plantilla Meta para autenticación/utilidad "a partir de" USD 0,0034 (tarifas internacionales de auth pueden ser mayores; Chile cotiza como mercado independiente con tiers de volumen propios desde el cobro por mensaje de julio 2025). Presupuesto realista de planificación: **USD 0,01–0,03 por OTP** → **60–85% más barato que SMS directo**, con ~90%+ de penetración de WhatsApp en Chile.
- Fuentes: https://www.twilio.com/en-us/whatsapp/pricing · https://developers.facebook.com/docs/whatsapp/pricing

**2.5** **Email OTP como fallback: gratis en Supabase**, pero en Free el límite de email de auth es **2 emails/hora por usuario** (y **30 usuarios nuevos/hora** incluso con SMTP personalizado) — suficiente para OTP de login de la comunidad, insuficiente para lanzamientos masivos. Fuente: https://supabase.com/docs/guides/platform/going-into-prod

## 3. Escenarios de costo mensual

Supuesto de volumen: 0,1 SMS/MAU/mes (base del escenario dado: 10 SMS para 100 usuarios).

| Concepto | A — Comunidad pequeña (100 MAU, 10 SMS/mes) | B — Crecimiento (5K MAU, ~500 SMS/mes) |
|---|---|---|
| Supabase plan | Free: **USD 0** | Pro: **USD 25** (recomendado, ver 1.3) |
| Cron (pg_cron, cada 5–15 min) | USD 0 (2.880–8.640 inv/mes de las 500K incluidas) | USD 0 |
| Twilio SMS (0,0797/msg) | USD 0,80 | USD 39,85 |
| Número Twilio Chile | USD 10 (fijo) | USD 10 (fijo) |
| Vercel | USD 0 (plan gratuito) | USD 0 |
| **Total stack** | **~USD 11/mes** | **~USD 75/mes** |
| Alternativa: WhatsApp OTP (0,01–0,03/msg) | USD 0,10–0,30 + número | USD 5–15 + número → total **~USD 40–50/mes** |

**Lectura del cruce de umbrales:**
- **El volumen de SMS es ortogonal a la decisión de plan.** Free→Pro no lo gatilla el costo por mensaje sino la cláusula de pausa de 7 días (1.3): en un producto que debe monitorear 24/7, Pro se justifica **desde el lanzamiento en producción**, no cuando "se llena" el Free.
- Con 5K MAU no se tocan los límites de MAU (50K), DB (500 MB) ni egress (5 GB, monitorear con caché) del Free; el cap de **50K MAU o 500 MB DB** sería el gatillo numérico si se decidiera diferir el Pro.
- El SMS es el único costo variable real: a 500 OTP/mes, SMS directo cuesta ~USD 40 vs ~USD 10–15 vía WhatsApp. Recomendación de canal: **WhatsApp OTP como canal primario + SMS Twilio solo como fallback** para usuarios sin WhatsApp.

## 4. Datos del volcán: ingreso manual vs automatización

**4.1** La fuente oficial es manual en la práctica: Sernageomin publica los reportes como **PDF con timestamp en el nombre** (ej. `REAV_NevChillan_20260615_1700.pdf`), sin API pública. Fuente: https://www.sernageomin.cl/alertas-volcanicas/

**4.2** Operación manual: ~1 reporte diario + REAV especiales en actividad. Ingreso manual estimado: **10–15 min por reporte** (leer PDF, extraer 5–10 campos: nivel de alerta, sismicidad, gases, deformación, riesgo) + chequeo/validación → **~30 min/día → 7,5–15 h/mes**.

**4.3** Costo:
- Operador pagado a USD 10–20/h → **USD 75–300/mes**.
- Operador voluntario → USD 0, pero con riesgo de continuidad (vacaciones, emergencias, churn) en un producto donde una actualización omitida es una falla de seguridad.

**4.4** Automatización: descarga del PDF + extracción asistida + job pg_cron cada 15 min (**USD 0/mes** en Free, hallazgo 1) + **validación humana final** (la firma humana importa en un producto de seguridad). Costo: horas de desarrollo únicas, runtime USD 0. **Payback: 1–2 meses vs operador pagado**; si el operador es voluntario comprometido, la automatización asistida sigue valiendo por continuidad, pero sin urgencia financiera. Recomendación: automatizar la extracción con human-in-the-loop, no el ingreso manual puro ni la publicación automática sin revisión.

## 5. Recomendación de plan

1. **Free durante desarrollo y demo** (sin cron de producción ni SMS reales; el proveedor Phone sigue deshabilitado en el dashboard — coherente con esto).
2. **Pro (USD 25/mes) al pasar monitoreo 24/7 a producción**: elimina la pausa por inactividad (riesgo crítico para alertas), agrega backups descargables, 100K MAU y crédito de cómputo de USD 10.
3. **Canal OTP: WhatsApp como primario (~USD 0,01–0,03/msg) + SMS Twilio como fallback (~USD 0,08/msg + USD 10/mes de número)**; email OTP como respaldo gratuito dentro de los límites de tasa de Free.
4. Presupuesto mensual realista: **USD 11 (A, Free) → USD 40–75 (B, Pro + OTP)**. El gatillo de migración a Pro no es el volumen, es el requisito 24/7; el cap de 50K MAU / 500 MB DB / 5 GB egress es el umbral numérico si se quisiera diferir.

## Fuentes
- Supabase cron (pg_cron): https://supabase.com/docs/guides/cron
- Supabase scheduled functions: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase going into prod (pausa Free, límites email): https://supabase.com/docs/guides/platform/going-into-prod
- Supabase pricing (límites Free/Pro): https://supabase.com/pricing
- Supabase phone login (proveedores, rate limits): https://supabase.com/docs/guides/auth/phone-login
- Twilio SMS Chile: https://www.twilio.com/en-us/sms/pricing/cl
- Twilio Verify: https://www.twilio.com/en-us/verify/pricing
- Twilio WhatsApp: https://www.twilio.com/en-us/whatsapp/pricing
- Meta WhatsApp pricing: https://developers.facebook.com/docs/whatsapp/pricing
- Sernageomin alertas volcánicas (PDF de reportes): https://www.sernageomin.cl/alertas-volcanicas/
