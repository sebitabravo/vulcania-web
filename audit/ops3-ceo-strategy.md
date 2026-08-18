# Audit OPS3 — Estrategia de datos y operación (ceo-strategist)

Date: 2026-08-16 · Alcance: investigación web de fuentes oficiales (SERNAGEOMIN, SENAPRED, Smithsonian GVP, Municipalidad de Pucón) para cerrar los 3 gaps operativos: cronjob de estado, zonas seguras reales, y datos del Villarrica. Método: WebFetch + curl con UA de navegador (sernageomin.cl no valida certificado; volcano.si.edu y senapred.cl bloquean bots parcialmente).

## Hallazgos numerados (con evidencia)

1. **[FACT] No existe una API ni feed estructurado (RSS/JSON) de SERNAGEOMIN para el estado volcánico.** Todo lo que publica la RNVV es PDF o comunicado. La página oficial de alertas — https://www.sernageomin.cl/alertas-volcanicas/ — dice textualmente: "la visualización en tiempo real de esta información no se encuentra disponible en el sitio web" (actualizada 2026-07-08). Solo publica Reportes Especiales de Actividad Volcánica (REAV) en PDF por volcán en alerta elevada (hoy solo Nevados de Chillán: `REAV_NevChillan_20260615_1700.pdf`, 323 KB, en https://www.sernageomin.cl/wp-content/uploads/2026/06/REAV_NevChillan_20260615_1700-1.pdf).

2. **[FACT] El sitio de visualización RNVV en tiempo real no existe hoy.** `https://rnvv.sernageomin.cl/` no resuelve (HTTP 000, dominio no registrado/en uso) y `https://www.sernageomin.cl/red-nacional-de-vigilancia-volcanica/` devuelve 404. La noticia oficial https://www.sernageomin.cl/sernageomin-garantiza-continuidad-del-monitoreo-volcanico-nacional-y-avanza-en-la-restauracion-segura-de-sus-servicios-digitales/ confirma que tras el "incidente informático de público conocimiento" (ciberataque), la visualización pública fue retirada para reconstruirse "bajo protocolos de seguridad reforzada", mientras OVDAS sigue monitoreando 24/7 y entrega los RAV/REAV "de forma directa a las autoridades" (SENAPRED). Conclusión operativa: el dato oficial de alerta no tiene cauce público automatizable hoy.

3. **[FACT] El volcán Villarrica está hoy en alerta Verde (verde), el nivel más bajo de la escala de 4.** Lo confirma el reporte semanal del Smithsonian GVP (5–11 marzo 2026), que además informa aumento de temperaturas en el cráter durante febrero 2026 y lava visible en un respiradero el 6 de marzo 2026, sin cambio de alerta: https://volcano.si.edu/volcano.cfm?vn=357120 (sección "Latest Weekly Volcanic Activity Report"). Consistente con el hallazgo 1: Villarrica no figura en "Información de volcanes en alertas" de SERNAGEOMIN (solo aparece Nevados de Chillán), porque no está en alerta elevada.

4. **[FACT] El Smithsonian GVP es la mejor fuente estructurada para "datos del volcán" (gap 3).** La página oficial https://volcano.si.edu/volcano.cfm?vn=357120 publica: tipo (estratovolcán compuesto), coordenadas 39.42°S 71.93°W, altura 2,847 m, "Last Known Eruption 2025 CE", periodo eruptivo actual 2014-12-02 → 2025-04-19 (lava lake, VEI 3), población a 5/10/30/100 km (477/1,067/35,118/667,788), historia eruptiva y reportes semanales (Weekly Volcanic Activity Report) y mensuales (Bulletin). El nav del sitio incluye sección "Webservices / API" (API REST con datos GeoJSON); el endpoint dio 403 Cloudflare desde este host — verificar alcance desde un navegador antes de prometer integración directa. Cadencia: semanal, curado por humanos, con ~1 semana de desfase. No es tiempo real, pero es citable y estable.

5. **[FACT] SENAPRED sí tiene una API de alertas, pero no es consumible por un cronjob sin trabajo sucio.** La sección de alertas https://www.senapred.cl/eventos/ es una SPA React respaldada por AWS AppSync GraphQL (endpoint `rz2uv7ifxbgflh2bqmp6kmh4le.appsync-api.us-east-1.amazonaws.com/graphql`, con `x-api-key` embebida en el bundle JS). Una consulta directa devuelve `401 UnauthorizedException: "Valid authorization header not provided"`: requiere el flujo de auth de Amplify (Cognito), no solo la API key. Es raspable replicando el flujo del navegador, pero frágil y de uso gris — no recomendado como fuente primaria.

6. **[FACT] Las zonas seguras / puntos de encuentro de Pucón NO son datos públicos accesibles hoy.** `https://www.munipucon.cl/` redirige a `https://municipalidadpucon.cl/`; el sitio tiene una "Dirección Gestión del Riesgo de Desastres" en su menú institucional, pero no publica el Plan Comunal de Emergencia ni mapas de zonas seguras en páginas accesibles desde la home (el buscador del sitio devuelve 404 y el contenido es mayormente JS). SENAPRED mantiene páginas de planes (`https://www.senapred.cl/plan-especifico-de-emergencia/`, `https://www.senapred.cl/planes-especificos/`) y una sección "Planos de Evacuación", sin PDFs de Villarrica/Pucón visibles en el HTML estático.

7. **[FACT] Los mapas de peligro del Villarrica no están publicados en el sitio actual de SERNAGEOMIN.** `https://www.sernageomin.cl/mapa-de-peligros-volcan-villarrica/` y variantes devuelven 404; la búsqueda interna del sitio (`/?s=mapa de peligro`, `/?s=Villarrica`) no arroja páginas del volcán (solo noticias). El único documento de riesgo publicado es el ranking nacional `Ranking-2023_tabloide_20231012.pdf` (https://www.sernageomin.cl/wp-content/uploads/2026/04/Ranking-2023_tabloide_20231012.pdf; el texto no fue extraíble con extracción plana, sin posiciones verificadas). El mapa de peligros del Villarrica existe como publicación histórica de SERNAGEOMIN, pero hay que solicitarlo o archivarlo externamente.

8. **[FACT] Conclusión de automatización:** ninguna fuente oficial entrega el estado del volcán en formato automatizable limpio. SERNAGEOMIN = PDFs ad hoc (solo cuando hay alerta elevada); SENAPRED = SPA con API autenticada; GVP = semanal y con desfase. El cronjob 100% automático (sin verificación humana) es inviable hoy con datos oficiales. La alternativa creíble es un pipeline híbrido: detección automática + confirmación humana del operador.

## Recomendaciones priorizadas

### Prioridad 1 — Pipeline híbrido de estado: cronjob de detección + ingreso con verificación humana (desbloquea gap 1)

- **Cronjob (GitHub Actions scheduled, no Vercel Cron: en el plan Free de Vercel no existen los crons)** que cada 4–6 h:
  - Hace GET a `https://www.sernageomin.cl/alertas-volcanicas/` y detecta REAV/RAV nuevos por fecha/nombre de archivo PDF (comparando contra el último visto). El hallazgo 1 es la fuente a vigilar.
  - Hace GET a `https://volcano.si.edu/volcano.cfm?vn=357120` y detecta si el "Latest Weekly Volcanic Activity Report" cambió y menciona a Villarrica.
  - Ante un cambio: notifica al operador (correo/Telegram/lo que use el owner) con el enlace del PDF, sin publicar nada.
- **Proceso de ingreso del operador** (no-opinión: obligatorio por el hallazgo 2): el cambio de nivel de alerta (verde→amarillo→naranja→roja) se publica solo después de que el operador lea el REAV/comunicado oficial, registre `fuente_url`, `fecha_publicacion` y `fecha_verificacion`. Todo cambio de alerta queda en un log de auditoría. Es una regla de producto, no una preferencia.
- **Mostrar en la UI**: nivel oficial + "Fuente: SERNAGEOMIN" + "Última verificación: {fecha}" + disclaimer "Vulcania no es fuente oficial; consulte sernageomin.cl / senapred.cl".
- **Anti-envejecimiento**: si pasan >7 días sin verificación (o >2 reportes semanales GVP sin revisar), marcar el dato como "no verificado" en la UI. El dato envejecido visible es mejor reputacionalmente que un dato silenciosamente viejo.

### Prioridad 2 — Zonas seguras: gestión oficial, no scraping (desbloquea gap 2)

- El hallazgo 6 obliga a que las zonas seguras se obtengan por canal oficial: solicitud formal (OIRS o Dirección Gestión del Riesgo de Desastres) a la Municipalidad de Pucón y/o a SENAPRED Araucanía, pidiendo el Plan Comunal de Emergencia / Plan Específico por Variable de Riesgo Volcánica y los puntos de encuentro cartografiados.
- Al importarlas: cada zona con atribución (`fuente`, `documento`, `fecha`), visibles en el mapa con etiqueta "zona oficial" o "por confirmar" según la trazabilidad del dato. Es la única forma de que el mapa de Vulcania no sea una invención con firma de la plataforma.
- Iniciar la gestión ya: es el gap más lento (canal humano de un municipio), por eso se dispara en paralelo a la Prioridad 1, aunque se publique después.

### Prioridad 3 — Página de datos del volcán con fuentes citadas (desbloquea gap 3, el más barato)

- Poblar la ficha del Villarrica con los datos verificados del GVP (hallazgo 4): altura 2,847 m, coordenadas, tipo, última erupción 2025 CE, periodo 2014–2025, escala de alerta explicada, y el último reporte semanal GVP con su enlace.
- No inventar parámetros de monitoreo en tiempo real (sismicidad, deformación, SO₂): hoy no son públicos (hallazgo 2). Mostrar solo lo que existe y citar el origen. Un "dato en vivo" falso es el mayor riesgo reputacional de la plataforma.
- Costo: bajo (una página + datos curados). Impacto inmediato en credibilidad: la plataforma pasa de "aplicación bonita" a "fuente informativa con trazabilidad".

### Riesgos reputacionales (para el contrato de producto)

- **El riesgo fatal es el nivel de alerta incorrecto**: mostrar Verde cuando lo oficial es Amarillo pone en peligro vidas; mostrar elevación sin base oficial es pánico y demanda civil. Por eso: jamás publicar un cambio de alerta sin verificación humana sobre el comunicado oficial (Prioridad 1), y siempre mostrar la fuente y la fecha (evidencia: hallazgos 1, 2 y 3).
- **Datos de zonas seguras inventados o desactualizados** pueden dirigir evacuaciones a lugares inseguros: solo zonas con atribución oficial o etiquetadas "por confirmar" (Prioridad 2).
- **Presentarse como fuente oficial** (sin disclaimer) expone a Vulcania a confusión institucional y responsabilidad: disclaimer + enlace a la fuente en cada dato derivado.
- **Dato envejecido silencioso** erosiona la confianza más rápido que un dato marcado como desactualizado: el mecanismo anti-stale de la Prioridad 1.

### División automatización vs. operador humano

| Tarea | Quién |
|---|---|
| Detectar nuevos REAV/PDF en sernageomin.cl y cambios en GVP | Cron (automático) |
| Avisar al operador con enlace y diff | Cron (automático) |
| Confirmar y publicar cambio de nivel de alerta | Operador humano, SIEMPRE |
| Registrar fuente, fecha y verificación (log de auditoría) | Sistema (automático, obligatorio) |
| Importar/actualizar zonas seguras | Operador, con atribución oficial |
| Rendering de datos, stale-marking, disclaimers | Sistema (automático) |
| Decisiones de publicación en alerta naranja/roja | Operador + escalamiento al owner, sin auto-publicación |

## Resumen ejecutivo (una línea por gap)

- **Gap 1 (cronjob)**: no hay feed oficial que automatizar — el cron viable es un detector + notificador con confirmación humana del operador antes de publicar; Vercel Free no soporta cron (usar GitHub Actions).
- **Gap 2 (zonas seguras)**: no son públicas — gestionarlas por canal oficial con la Municipalidad de Pucón / SENAPRED Araucanía, con atribución por zona; iniciar ya porque es el trámite más lento.
- **Gap 3 (datos del volcán)**: el GVP (Smithsonian) es la fuente estructurada confiable para la ficha técnica; no publicar parámetros en tiempo real que hoy no existen públicamente.

Orden de ejecución: 1) pipeline híbrido de alerta, 2) gestión oficial de zonas seguras (disparada en paralelo), 3) ficha técnica del volcán. Los tres comparten el mismo principio: **solo publicar lo que tiene fuente oficial verificada, y mostrar siempre la trazabilidad**.
