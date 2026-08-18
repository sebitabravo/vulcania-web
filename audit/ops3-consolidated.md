# OPS3 — Auditoría consolidada: operatividad 100% (cronjob, zonas seguras, datos del volcán)

**Fecha:** 2026-08-16 · **Método:** 4 agentes en paralelo (ceo-strategist, cfo-finance, marketing-strategist, legal-compliance) con investigación web de fuentes oficiales, más verificación técnica local contra el repositorio y sus contratos. El proyecto Supabase real no se declara verificado sin `pnpm doctor`/E2E autenticados.
**Informes fuente:** `audit/ops3-ceo-strategy.md` · `audit/ops3-cfo-finance.md` · `audit/ops3-marketing-data.md` · `audit/ops3-legal-compliance.md`

---

## 1. Veredicto: ¿qué falta para el 100% operativo?

El proyecto ya tenía la base de infraestructura; este cierre agrega el contrato local de operabilidad (15 tablas en `scripts/init.sql`, RLS, fuentes, consentimiento, detector Deno y UI trazable). La ejecución remota del schema/schedule sigue siendo un gate separado. **Lo que falta no es solo código de plataforma: también son datos GIS oficiales y activación operativa.** El hallazgo transversal sigue siendo duro: **ninguna fuente oficial chilena entrega el estado del volcán en formato automatizable limpio.**

| Gap | Qué falta | Fuente de datos real | Viabilidad de automatización |
|---|---|---|---|
| 1. Cronjob de estado | Actualización del nivel de alerta sin depender del ingreso manual 100% | SERNAGEOMIN (PDF REAV/RAV, sin API); GVP Smithsonian (semanal, curado) | **Parcial** — detector automático + confirmación humana SIEMPRE |
| 2. Zonas seguras | Puntos de encuentro y áreas de evacuación reales de Pucón | SENAPRED Visor Chile Preparado (.shp/.kmz); plano Villarrica "en actualización"; Municipalidad de Pucón (OIRS) | **No** — gestión oficial manual, trámite lento |
| 3. Datos del volcán | Ficha técnica real del Villarrica en `informacion_volcan` | GVP Smithsonian (vn=357120), Wikipedia contrastada | **Sí** — datos estáticos curados una vez |

**Dato histórico verificable en la fuente consultada:** Villarrica aparece en **alerta Verde** en el reporte GVP 5-11 mar 2026; eso no es prueba de vigencia en agosto y la UI lo marca por fecha. La ficha GVP consultada informa 2.847 m, 39.42°S/71.93°W, estratovolcán, 152 periodos eruptivos confirmados y periodo eruptivo 2014-12-02 → 2025-04-19 (VEI 3). El claim heredado de +82/VEI 2 se dejó fuera de la carga principal porque no coincide con la ficha GVP actual; cualquier uso futuro debe citar una fuente separada. El riesgo de lahares sigue como riesgo operativo principal para la comunicación.

## 2. Lo que dice cada fuente sobre los gaps

### Gap 1 — Cronjob (ceo + cfo)
- SERNAGEOMIN: **no hay API ni feed**. Su página de alertas declara "la visualización en tiempo real de esta información no se encuentra disponible en el sitio web" (tras ciberataque; RNVV retirado; OVDAS monitorea 24/7 pero entrega reportes directo a autoridades). Solo REAV/RAV en PDF por volcán en alerta elevada (hoy solo Nevados de Chillán).
- SENAPRED alertas: SPA React con API GraphQL (AWS AppSync) detrás de auth Amplify/Cognito — raspable pero frágil y de uso gris.
- GVP: fuente estructurada semanal, curada por humanos, ~1 semana de desfase, citable y estable. Tiene "Webservices/API" (GeoJSON) pero 403 anti-bot desde este host.
- **Conclusión técnica:** cron 100% automático = inviable. Diseño correcto = **pipeline híbrido**: detector automático (edge function scheduled o GitHub Actions) que vigila la página de alertas SERNAGEOMIN y el reporte GVP; ante cambio, notifica al operador **sin publicar nada**; el operador confirma el cambio de alerta con `fuente_url` + `fecha_verificacion` (log de auditoría obligatorio).
- **Costos (cfo):** pg_cron/scheduled functions gratis en Free (8 jobs concurrentes, 10 min/job; 500K invocaciones/mes). **Gotcha crítico: Supabase pausa proyectos Free tras 7 días de baja actividad** — en un producto de alerta 24/7 eso es riesgo de vida → Pro ($25/mes) se justifica desde producción.
- **Anti-envejecimiento:** >7 días sin verificación → marcar "no verificado" en la UI. Dato viejo visible > dato silenciosamente viejo.

### Gap 2 — Zonas seguras (marketing + ceo)
- El plano de evacuación del Volcán Villarrica está **"en proceso de actualización"** en SENAPRED Araucanía — sin PDF descargable (Llaima, Lonquimay, Melipeuco sí tienen).
- La fuente georreferenciada real: **Visor Chile Preparado** de SENAPRED — GIS con capas descargables `.shp`/`.kmz` de áreas de evacuación, puntos de encuentro y vías de evacuación. Acción: descargar las capas de la comuna de Pucón y extraer los puntos reales.
- Municipalidad de Pucón: SPA sin contenido indexable; hay "Dirección de Gestión del Riesgo de Desastres" — solicitud formal (OIRS) del Plan Comunal de Emergencia.
- **Los puntos que hoy muestra Vulcania en demo (Estadio Pucón, etc.) no están verificados contra ninguna fuente.** No publicarlos como oficiales hasta la importación.
- Regla: cada zona con atribución (`fuente`, `documento`, `fecha`) y etiqueta "zona oficial" vs "por confirmar" / "comunitaria".

### Gap 3 — Datos del volcán (marketing + ceo)
- Poblar `informacion_volcan` con los datos GVP (tabla de datos en `ops3-marketing-data.md` §3.2).
- **No inventar parámetros en tiempo real** (sismicidad, deformación, SO₂): hoy no son públicos. `parametros_volcan` queda para cuando exista fuente (o ingreso manual del operador con fuente).

### Legal (legal-compliance) — no bloquea el merge, sí bloquea el "100% operativo"
- **Consentimiento expreso y documentado** para guardar teléfono+nombre (art. 4 Ley 19.628; desde 01-12-2026: Ley 21.719 con Agencia de Protección de Datos y multas hasta 20.000 UTM).
- **Riesgo CRÍTICO:** publicar alerta desactualizada o punto de encuentro errado = responsabilidad extracontractual (Código Civil arts. 2314+). Mitigación: timestamp + fuente + enlace + expiración automática + etiquetas de no verificado.
- **Republicación de datos oficiales:** legal bajo Ley 20.285 con atribución, fecha/hora y enlace al original; no modificar el contenido de los RAV. SERNAGEOMIN califica sus reportes como "información PRELIMINAR" — replicar ese patrón de disclaimer.
- **Twilio AUP:** consentimiento previo + opt-out obligatorio para SMS (alerta transaccional OTP no requiere opt-in marketing, pero alertas proactivas sí).
- **Menores:** bloquear registro <18.
- Checklist legal mínimo de 12 puntos en `ops3-legal-compliance.md` §2.

## 3. Costos reales (cfo)

| Concepto | Free | Pro ($25/mes) |
|---|---|---|
| Cron detector (cada 4-6 h) | USD 0 (500K inv/mes incluidas) | USD 0 |
| SMS OTP Twilio a Chile | USD 0,08/msg + número USD 10/mes | igual |
| WhatsApp OTP (recomendado) | USD 0,01-0,03/msg | igual |
| **Riesgo Free** | **Pausa tras 7 días de baja actividad → monitoreo apagado** | Sin pausa + backups + USD 10 cómputo |
| Total stack/mes | ~USD 11 (100 MAU) | USD 40-75 (5K MAU + OTP) |

**Decisión recomendada:** Free durante desarrollo; **Pro al pasar monitoreo 24/7 a producción** (el gatillo no es volumen, es la cláusula de pausa). OTP: WhatsApp primario + SMS fallback + email.

## 4. Cómo realizarlo — orden de ejecución

1. **Ficha técnica del volcán (gap 3, más barato):** seed real en `informacion_volcan` con datos GVP + escala de alerta explicada + último reporte GVP enlazado. Impacto inmediato en credibilidad.
2. **Pipeline híbrido de alerta (gap 1):** detector scheduled (edge function Supabase con pg_cron o GitHub Actions) + notificación al operador + extensión de `cambiar_nivel_alerta` con `fuente_url`/`fecha_verificacion` + log de auditoría + stale-marking en la UI.
3. **Gestión oficial de zonas seguras (gap 2, disparar YA en paralelo):** solicitud OIRS a Municipalidad de Pucón / SENAPRED Araucanía + descarga de capas del Visor Chile Preparado; importación con atribución.
4. **Capa legal (desbloquea producción responsable):** términos, privacidad, consentimiento con timestamp, opt-in SMS, 18+, disclaimers fuente+timestamp en toda la UI, canal oficial visible, educación SAE.

## 5. Reglas de producto (no negociables, de la auditoría)

1. Jamás publicar un cambio de nivel de alerta sin verificación humana sobre el comunicado oficial.
2. Todo dato dinámico lleva "Datos referenciales" + fuente + fecha/hora + enlace al original.
3. Si la fuente cae: mostrar "sin datos oficiales disponibles" + canal oficial — nunca rellenar.
4. Zonas del mapa: "oficial" vs "por confirmar" siempre diferenciado; nada de puntos sin atribución.
5. Dato envejecido >7 días = marcado "no verificado" en la UI.
6. Vulcania es agregador que cita, no fuente primaria; el SAE es la alerta real, educar sobre él.
7. No inventar parámetros de monitoreo en tiempo real que no existen públicamente.

## 6. Entregables generados

- `openspec/changes/volcan-data-operability/` — spec completo (proposal, requirements, design, tasks)
- `audit/ops3-{ceo-strategy,cfo-finance,marketing-data,legal-compliance}.md` — informes de los agentes
