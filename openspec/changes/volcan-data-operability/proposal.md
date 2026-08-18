# Operabilidad de datos volcánicos (cronjob, zonas seguras, datos del volcán)

## Resumen

Cerrar los tres gaps que separan a Vulcania de la operatividad 100%: (1) actualización del estado de alerta sin depender del ingreso manual puro, (2) zonas seguras reales de Pucón con atribución oficial, (3) ficha técnica real del volcán Villarrica. El cambio introduce un pipeline híbrido de detección automática con confirmación humana obligatoria, gestión oficial de zonas seguras con trazabilidad, y datos curados del Smithsonian GVP. La auditoría OPS3 (4 agentes: ceo, cfo, marketing, legal) concluyó que **no existe fuente oficial chilena automatizable** para el estado del volcán, por lo que el diseño no intenta automatizar la publicación, sino la detección y la trazabilidad.

## Justificación

- SERNAGEOMIN no tiene API ni feed: solo PDF REAV/RAV ("la visualización en tiempo real no se encuentra disponible en el sitio web").
- El plano de evacuación del Villarrica está "en proceso de actualización" en SENAPRED; los puntos de encuentro actuales de Vulcania no están verificados contra ninguna fuente.
- El repositorio tiene configuración de full mode, pero la base Supabase real no se considera verificada desde este cambio: requiere aplicar `scripts/init.sql`, ejecutar `pnpm doctor` y completar los smoke/E2E. El seed deja `parametros_volcan` sin métricas de monitoreo inventadas.
- Riesgo legal CRÍTICO si se publica un nivel de alerta desactualizado o un punto de encuentro errado (Código Civil arts. 2314+; Ley 19.628 art. 23; Ley 21.719 desde 01-12-2026).

## Modo

addition

## Problemas que resuelve

1. El nivel de alerta depende de que un operador sepa que hubo un reporte nuevo.
2. Los datos técnicos del volcán son genéricos o demo, no los reales verificados.
3. El mapa muestra puntos de encuentro sin atribución, indistinguibles de datos oficiales.
4. No hay registro auditable de cuándo, quién y con qué fuente se cambió un nivel de alerta.
5. No hay mecanismo que marque un dato envejecido como "no verificado".
6. No hay consentimiento documentado para los datos personales ni términos legales.

## Riesgos

- **CRÍTICO:** publicar un cambio de alerta sin verificación humana (vidas en riesgo, responsabilidad civil). Mitigado: publicación solo por operador con `fuente_url` + `fecha_verificacion`.
- **ALTO:** datos personales sin consentimiento (Ley 19.628 art. 4; Ley 21.719 desde 01-12-2026). Mitigado: consentimiento con timestamp + términos + privacidad + opt-in SMS + 18+.
- **ALTO:** zonas seguras inventadas o desactualizadas. Mitigado: atribución por zona, etiquetas "oficial"/"por confirmar", gestión oficial OIRS.
- **MEDIO:** Free plan pausa proyectos tras 7 días de inactividad (monitoreo apagado). Mitigado: recomendación Pro al pasar a producción 24/7; actividad del detector cada 4-6 h.
- **MEDIO:** datos envejecidos silenciosos. Mitigado: stale-marking automático (>7 días sin verificación → "no verificado").

## Alternativas consideradas

- **Automatización total del nivel de alerta (scraping directo SERNAGEOMIN/SENAPRED):** descartada — no hay API; SENAPRED usa AppSync autenticado (frágil, uso gris); la confirmación humana es requisito legal y de seguridad.
- **Ingreso manual puro del operador:** rechazada como única vía — no hay detección proactiva; reportes PDFs se pierden en los períodos de calma.
- **Vercel Cron:** descartado — el plan Free de Vercel no tiene cron jobs.
- **pg_cron + pg_net para el detector:** viable (gratis) pero requiere HTTP externo que pg_net expone de forma limitada; se prefiere edge function scheduled (misma infraestructura, HTTP completo).
- **GitHub Actions scheduled:** alternativa válida sin costo, pero descentraliza la lógica del proyecto; se documenta como opción B.

## Referencias

- Auditoría: `audit/ops3-consolidated.md` y `audit/ops3-{ceo-strategy,cfo-finance,marketing-data,legal-compliance}.md`
