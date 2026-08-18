# OPS3 — Cumplimiento legal Chile: Vulcania (monitoreo Volcán Villarrica, Pucón)

Fecha del análisis: 2026-08-16. Método: investigación web (WebFetch + curl, sin motor de búsqueda dedicado). Alcance: datos personales (teléfono + nombre), republicación de datos oficiales, responsabilidad por datos incorrectos, alerta temprana, y documentos legales mínimos para lanzar.

> Limitación de verificación (evidencia honesta): el texto oficial en `bcn.cl/leychile` no es accesible a bots — la app responde "proceso demora demasiado" y carga reCAPTCHA (verificado tanto vía WebFetch como curl, HTTP 200 con shell + `recaptcha/enterprise.js`). Los artículos de las leyes se citaron desde el mirror `leyes-cl.com` (índice actualizado al 09-08-2026, marcado "Vigente, con las modificaciones"), que es un espejo del texto de LeyChile. SENAPRED publica sus avisos en una SPA React (`/eventos/`) sin contenido estático, y `datos.gob.cl` renderiza sus páginas legales vía JS (stubs). Cada hallazgo declara dónde se verificó.

## 1. Hallazgos

**H1 — Ley 19.628 (vigente hasta el 30-11-2026): guardar teléfono y nombre requiere consentimiento expreso, informado y por escrito.**
- Evidencia: https://www.bcn.cl/leychile/navegar?idNorma=141331 (testeado; bloqueado a bots) y texto articulado en https://leyes-cl.com/sobre_proteccion_de_la_vida_privada/4.htm
- Art. 4 (citado): "El tratamiento de los datos personales sólo puede efectuarse cuando esta ley u otras disposiciones legales lo autoricen o el titular consienta expresamente en ello. La persona que autoriza debe ser debidamente informada respecto del propósito del almacenamiento de sus datos personales y su posible comunicación al público. La autorización debe constar por escrito."
- Consecuencia: el flujo de registro con OTP no basta por sí solo; se necesita un acto de consentimiento documentado (checkbox + registro con timestamp), con finalidad declarada (autenticación, alertas, comunidad) y revocación por escrito (el art. 4 permite revocar "sin efecto retroactivo").

**H2 — Ley 19.628: derechos del titular y responsabilidad civil por tratamiento indebido.**
- Evidencia: https://leyes-cl.com/sobre_proteccion_de_la_vida_privada/12.htm y .../23.htm
- Art. 12: derecho a exigir "información sobre los datos relativos a su persona, su procedencia y destinatario, el propósito del almacenamiento", a que "se modifiquen" los datos erróneos, y a exigir la eliminación si el almacenamiento "carezca de fundamento legal" o los datos "estuvieren caducos". O sea: Vulcania necesita un canal ARCO (acceso, rectificación, cancelación) operativo.
- Art. 23: "La persona natural o jurídica privada o el organismo público responsable del banco de datos personales deberá indemnizar el daño patrimonial y moral que causare por el tratamiento indebido de los datos" — procedimiento sumario, indemnización fijada prudencialmente por el juez. Esta es la base civil directa si un teléfono/nombre se usa mal o se filtra.

**H3 — Ley 21.719 (publicada 13-12-2024): reescribe la 19.628 y crea la Agencia de Protección de Datos Personales; vigencia plena el 01-12-2026.**
- Evidencia: https://www.privacidadweb.cl/aprende/ley-21719 (guía actualizada a junio 2026), https://www.recordinglaw.com/es/world-laws/world-data-privacy-laws/chile-data-privacy-laws/ y https://confidata.cl/es/blog/apdp-agencia-proteccion-datos-chile
- Puntos que afectan a Vulcania: consentimiento "expreso, informado y específico" (art. 12); 6 derechos del titular (acceso, rectificación, supresión, oposición, portabilidad, bloqueo temporal; art. 5-9) con respuesta en 30 días corridos (art. 11); deberes de seguridad (art. 14 quinquies); notificación de brechas a la APDP "por los medios más expeditos posibles y sin dilaciones indebidas" (art. 14 sexies), con notificación directa a titulares afectados si los datos comprometidos son sensibles o de menores de 14 años; multas de 5.000/10.000/20.000 UTM (~$358M/$715M/$1.430M CLP); las pymes no están exentas, solo hay amonestación en vez de multa entre 01-12-2026 y 01-12-2027 (art. sexto transitorio).
- Decisión de negocio: si el lanzamiento ocurre antes del 01-12-2026 rige la 19.628 con su art. 23; a partir de esa fecha la plataforma queda bajo la APDP con el régimen completo. Diseñar el producto para la 21.719 desde el día uno evita una migración regulatoria al mes siguiente.

**H4 — Datos volcánicos oficiales: SERNAGEOMIN publica alertas y RAV sin licencia explícita visible, y con lenguaje de "información preliminar".**
- Evidencia: https://www.sernageomin.cl/alertas-volcanicas/ (HTML verificado por curl)
- La página "Alertas volcánicas" declara: monitoreo 24/7 por OVDAS/RNVV; lista "volcanes en alertas" (al 08-07-2026, última actualización de la página: Complejo Volcánico Nevados de Chillán; el Villarrica no figura entre los volcanes en alerta); publica "Reporte Especial de Actividad Volcánica (REAV)" y RAV en PDF con la salvedad textual: "información PRELIMINAR, obtenida a través de los equipos de monitoreo de la Red Nacional de Vigilancia Volcánica (RNVV), procesados y analizados en el Observatorio Volcanológico de los Andes del Sur (Ovdas)".
- No se encontró licencia (CC u otra), términos de uso ni política de privacidad en el sitio (la home solo enlaza a transparencia y avisos laborales). Los datos de actividad volcánica son de un órgano público: republicarlos es legal bajo el marco de la Ley 20.285, pero **sin licencia explícita no hay autorización formal de reutilización** — el correcto es republicar con atribución, fecha/hora del reporte y enlace al original, y respetar que el estado oficial lo define SERNAGEOMIN/SENAPRED, no la plataforma.

**H5 — SENAPRED: los avisos/alertas viven en una SPA sin condiciones de uso explícitas.**
- Evidencia: https://www.senapred.cl/ (home, verificada), https://www.senapred.cl/eventos/ (SPA React: HTML de 1.961 bytes, todo el contenido es JS; el endpoint real es AppSync en AWS, inaccesible sin credenciales), https://www.senapred.cl/avisos/ (sirve la home)
- La home no muestra licencia, términos ni disclaimer de reutilización; el footer enlaza a `portaltransparencia.cl` (cumplimiento de transparencia activa), "Ley Lobby", "Mercado Público" y cuentas públicas. Existe "Pruebas SAE" (Sistema de Alerta de Emergencia, calendario 2026).
- Implicancia: SENAPRED es el canal oficial de alerta (vía SAE y sus avisos). Vulcania debe operar como agregador con retorno al canal oficial, no como sustituto — esto se refuerza con la Ley 21.364 (H8).

**H6 — Ley 20.285 (acceso a la información pública): obliga a los órganos del Estado, no a los privados; habilita obtener y republicar datos públicos.**
- Evidencia: https://es.wikipedia.org/wiki/Consejo_para_la_Transparencia (CPLT creado por la Ley 20.285, promulgada 11-08-2008, vigente desde 20-04-2009), https://www.consejotransparencia.cl/ley-de-transparencia/ (confirma: la ley "garantiza y regula el derecho de las personas para acceder a la información de los organismos del Estado"; reclamos por denegación se resuelven como amparo ante el CPLT)
- SENAPRED y SERNAGEOMIN son órganos obligados a transparencia activa. Para Vulcania: la ley no obliga a un privado a republicar nada, pero da base para solicitar datos (p. ej., series históricas de RAV, mapas de riesgo) y para republicarlos; las restricciones legítimas son por reserva legal (seguridad nacional, datos personales) y no por copyright estatal.

**H7 — datos.gob.cl: el portal del Estado invita explícitamente a reutilizar los datos.**
- Evidencia: https://datos.gob.cl/ (verificado sin www; el dominio con `www` responde 404)
- Texto de la home: "reutilizar y desarrollar tu aplicación e investigación, con datos abiertos del sector público"; sección "Reutilización" con casos de uso de universidades, desarrolladores y startups; portal "Perteneciente al Ministerio de Hacienda". Las páginas "Política de Privacidad" (/privacy_policies) y "Términos y Condiciones de uso" (/terms_and_conditions) existen pero son stubs renderizados por JS (sin texto estático verificable) y no se observa licencia CC explícita. La guía del portal para productores recomienda publicar con metadatos de licencia, pero SENAPRED/SERNAGEOMIN no aparecen en el portal con datasets volcánicos verificables en este análisis.

**H8 — Ley 21.364 (2021): el Sistema de Alerta Temprana y el Sistema de Información son estatales; la plataforma es complemento.**
- Evidencia: https://www.bcn.cl/leychile/navegar?idNorma=1160187 (testeado; bloqueado a bots) y articulado en https://leyes-cl.com/establece_el_sistema_nacional_de_prevencion_y_respuesta_ante_desastres.htm (índice, vigente con modificaciones, 2021)
- Art. 19: crea SENAPRED "como un servicio público descentralizado (...) encargado de asesorar, coordinar, organizar, planificar y supervisar" la gestión del riesgo. Art. 20: funciones (asesorar al Comité Nacional, formular normativa e instrumentos de gestión del riesgo).
- Art. 38 (citado): "Se entenderá por Sistema de Alerta Temprana al conjunto de capacidades necesarias para generar y difundir información de alerta que sea oportuna y significativa, para que las personas, las comunidades y las organizaciones expuestas a alguna amenaza se preparen y actúen de forma adecuada y con suficiente antelación".
- Art. 39: SENAPRED debe poner en marcha un Sistema de Información para la Gestión del Riesgo de Desastres que "integre toda clase de contenidos (...) obtenidos de todas las entidades nacionales".
- Consecuencia para Vulcania: la difusión de alertas a la población es función pública con marco propio (SAE). La app no puede presentarse como alerta oficial; su valor legalmente seguro es el de herramienta comunitaria que retransmite el estado oficial con atribución, latencia declarada y enlace a la fuente.

**H9 — Responsabilidad por datos incorrectos (nivel de alerta desactualizado o punto de encuentro errado).**
- Civil: el art. 23 de la Ley 19.628 (tratamiento indebido de datos personales) cubre el mal uso de los datos de usuarios, no el contenido de emergencia. Para el contenido aplica la responsabilidad extracontractual del Código Civil (arts. 2314 y ss.): daño patrimonial y moral, con dolo o culpa (art. 2314: "El que ha cometido un delito o cuasidelito que ha inferido daño a otro, es obligado a la indemnización"). Publicar un nivel de alerta desactualizado que induce a no evacuar, o un punto de encuentro errado, es el escenario de mayor exposición: daño grave, nexo causal verificable, y un juez apreciando el contexto de emergencia.
- Penal: no existe un tipo penal específico chileno por republicar información de emergencia desactualizada. Solo escenarios extremos y dolosos (falsificación de alerta que ponga en peligro la vida — arts. 193 y 468 del Código Penal en sus figuras de falsedad/estafa —, o el art. 268 del CP por omisión de auxilio) rozarían lo penal. La barrera práctica es la diligencia: si la plataforma es un agregador fiel de fuentes oficiales con fecha/hora, el riesgo penal es remoto.
- Contenido generado por usuarios (puntos de encuentro, chat): no existe en Chile un "safe harbor" legal expreso tipo CDA 230; la diligencia exigida es actuar ante notificación (retiro de contenido peligroso o falso) y no adoptar el contenido como propio. Validar o "endosar" los puntos de encuentro comunitarios convierte la opinión del usuario en afirmación de la plataforma — evitable etiquetándolos como contribuciones no verificadas.
- Práctica observada de mitigación en las fuentes: SERNAGEOMIN califica sus RAV como "información PRELIMINAR" (H4); es exactamente el patrón de disclaimer que Vulcania debe replicar: naturaleza referencial, fuente, fecha/hora y enlace al documento original.

**H10 — Twilio/SMS: el consentimiento previo y el opt-out son exigencia contractual.**
- Evidencia: https://www.twilio.com/en-us/legal/aup — sección "Prohibited Activities / Violations of Laws or Standards": el cliente debe cumplir "(a) consent be obtained prior to transmitting, recording, collecting, or monitoring data or communications" y "(b) compliance with opt-out requests for any data or communications". Requisitos adicionales por servicio y país en https://www.twilio.com/legal/service-country-specific-terms. (Los docs de Twilio sobre 10DLC devuelven 404 a clientes no navegador — no verificables por scraping.)
- Práctica operativa: el OTP de registro es transaccional y no requiere marketing opt-in, pero las alertas SMS proactivas de Vulcania sí deben ampararse en el consentimiento del usuario (finalidad declarada en la política de privacidad), documentado y revocable; envíos sin opt-in documentado arriesgan bloqueo de la campaña/número y multas.

**H11 — Menores de edad.**
- Evidencia: guía Ley 21.719 (https://www.privacidadweb.cl/aprende/ley-21719) — los datos de menores de 14 años se tratan como categoría sensible en la notificación de brechas; no hay en la guía una regla de edad mínima general para tratamiento.
- Práctica segura: exigir 18+ para registrarse (o consentimiento parental bajo 18), no recopilar datos de menores de 14, y tratar cualquier dato de NNA como sensible. La app comunitaria (chat) atrae público joven: la restricción debe estar en el flujo de registro y en los términos.

## 2. Checklist legal mínimo para lanzar

1. **Términos de uso** (aceptación en el registro): naturaleza referencial del servicio, prohibición de uso como fuente oficial de alerta, reglas del chat, derechos de la plataforma sobre contenido, ley aplicable chilena y domicilio.
2. **Política de privacidad**: qué datos se recopilan (teléfono, nombre), para qué finalidades (autenticación, alertas, comunidad), base legal (consentimiento, art. 4 Ley 19.628; art. 12 Ley 21.719), canal de ejercicio de derechos ARCO (art. 12-15), política de retención y borrado, contacto del responsable.
3. **Consentimiento expreso y documentado** al registrarse: checkbox separado + registro con timestamp de qué se consintió y para qué (OTP transaccional vs. alertas SMS vs. visibilidad del nombre en el chat).
4. **Opt-in SMS separado y revocable**: consentimiento específico para alertas por SMS (Twilio AUP H10), con mecanismo de baja visible y confirmación de la baja.
5. **Disclaimer de datos referenciales** en cada estado/punto de encuentro: "Información referencial obtenida de [SERNAGEOMIN/SENAPRED]; verifique en la fuente oficial"; fecha y hora de la última actualización; enlace al RAV/aviso original; y nota de que los puntos de encuentro comunitarios no están verificados.
6. **Canal oficial siempre visible**: enlace a https://www.sernageomin.cl/alertas-volcanicas/ y al aviso vigente de SENAPRED (https://www.senapred.cl/eventos/); aviso de emergencia real = SAE, no la app.
7. **Refresco automático y expiración de datos**: el nivel de alerta caduca (mostrar "obsoleto" si no se actualiza dentro de X); nunca mostrar un nivel sin fecha.
8. **Moderación del chat**: filtros automáticos, reporte, retiro ante notificación, y política de contenido peligroso o falso (H9).
9. **Seguridad y brechas**: cifrado en tránsito y reposo, acceso mínimo, plan de notificación de brechas (hoy: art. 23 Ley 19.628; desde 01-12-2026: art. 14 sexies Ley 21.719 con notificación a la APDP).
10. **Menores**: bloqueo de registro bajo 18 (o consentimiento parental), sin recopilación de datos de <14 (H11).
11. **Plan de transición a la Ley 21.719**: registro de actividades de tratamiento, delegado de datos si aplica, y evaluación del régimen transitorio pyme (amonestación hasta 01-12-2027).
12. **Atribución y no-endoso de datos oficiales**: los datos de SERNAGEOMIN/SENAPRED se republican sin licencia explícita (H4, H5): atribuir, citar fuente y no modificar el contenido de los RAV (fidelidad de copia).

## 3. Riesgos con severidad

| Severidad | Riesgo | Base | Mitigación |
|---|---|---|---|
| **CRÍTICO** | Publicar nivel de alerta desactualizado o punto de encuentro errado que induce a no evacuar | Responsabilidad extracontractual Código Civil arts. 2314 y ss.; daño moral cuantioso; riesgo reputacional y de vida | H9: timestamp + fuente + enlace + expiración automática + etiqueta de no verificados para UGC + disclaimer |
| **ALTO** | Tratamiento de teléfono/nombre sin consentimiento expreso documentado | Art. 4 Ley 19.628; art. 12 y multas hasta 20.000 UTM Ley 21.719 (desde 01-12-2026) | Checklist 3 y 2 |
| **ALTO** | Envío de SMS sin opt-in documentado o sin baja | Twilio AUP (H10); bloqueo de campaña; multas | Checklist 4 |
| **ALTO** | Brecha de datos (teléfonos+nombres) sin notificar | Art. 23 Ley 19.628; art. 14 sexies y 34 quáter Ley 21.719 (gravísima, deliberada) | Checklist 9 |
| **MEDIO** | Usuarios <14 registrados con datos personales | Ley 21.719 (datos de <14 como sensibles); daño reputacional | Checklist 10 |
| **MEDIO** | Contenido peligroso o falso en el chat no retirado ante notificación | Ausencia de safe harbor expreso en Chile; diligencia exigida al intermediario | Checklist 8 |
| **MEDIO** | Presentar la app como "alerta oficial" (confusión con SAE/SENAPRED) | Ley 21.364 arts. 38-39: el sistema de alerta temprana e información es estatal; riesgo de desinformación | Checklist 5 y 6 |
| **BAJO** | Retención indefinida de datos sin política | Arts. 12-13 Ley 19.628 (eliminación de datos caducos) | Checklist 2 (retención + borrado) |

## 4. Fuentes consultadas

- https://www.bcn.cl/leychile/navegar?idNorma=141331 (Ley 19.628 — bloqueada a bots, verificada la barrera)
- https://www.bcn.cl/leychile/navegar?idNorma=1160187 (Ley 21.364 — idem)
- https://leyes-cl.com/sobre_proteccion_de_la_vida_privada.htm (+ artículos 2, 4, 5, 7, 11, 12, 15, 23) — texto articulado, vigente al 09-08-2026
- https://leyes-cl.com/establece_el_sistema_nacional_de_prevencion_y_respuesta_ante_desastres.htm (+ artículos 19, 20, 21, 38, 39) — texto articulado
- https://www.privacidadweb.cl/aprende/ley-21719 — guía Ley 21.719 (junio 2026); corroborado por https://www.recordinglaw.com/es/world-laws/world-data-privacy-laws/chile-data-privacy-laws/ y https://confidata.cl/es/blog/apdp-agencia-proteccion-datos-chile
- https://www.sernageomin.cl/alertas-volcanicas/ — alertas volcánicas, RAV/REAV "información PRELIMINAR"
- https://www.senapred.cl/ (home), https://www.senapred.cl/eventos/ (SPA), https://www.senapred.cl/avisos/ (sirve la home) — sin condiciones de uso explícitas
- https://datos.gob.cl/ — portal de datos abiertos, invita a reutilizar; /privacy_policies y /terms_and_conditions son stubs JS
- https://es.wikipedia.org/wiki/Consejo_para_la_Transparencia y https://www.consejotransparencia.cl/ley-de-transparencia/ — Ley 20.285
- https://www.twilio.com/en-us/legal/aup — consentimiento previo y opt-out como requisito contractual

Nota: este informe es una investigación técnica de cumplimiento, no asesoría legal; los artículos de la Ley 21.719 y el régimen pyme transitorio deben revisarse por un abogado chileno antes de fijar la fecha de lanzamiento.
