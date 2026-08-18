# Auditoría de Datos y Comunicación — Ops 3: Zonas seguras, datos del volcán Villarrica y canales de alerta

**Proyecto:** vulcania-web (plataforma comunitaria de monitoreo del volcán Villarrica, Pucón, Chile)
**Rol:** marketing-strategist
**Fecha de verificación:** 2026-08-16
**Método:** WebFetch/Web sobre fuentes oficiales (SENAPRED, SERNAGEOMIN, Smithsonian GVP, municipalidad de Pucón, Wikipedia) y directorios turísticos. Se usaron URLs directas; los bloqueos de clientes automatizados se conservan como limitación y no se confunden con una prueba de disponibilidad para producción. Todo hallazgo está marcado como **VERIFICADO** (leído en la URL citada), **BLOQUEADO** (fuente inaccesible desde el cliente usado, con el error) o **POR VERIFICAR** (hipótesis sin fuente confirmada). En un producto de seguridad, distinguir los tres es la diferencia entre un dato y un rumor.

---

## 1. Resumen ejecutivo

Los tres datos que Vulcania necesita **existen en fuentes oficiales**, pero con un matiz crítico:

1. **Zonas seguras:** el plano de evacuación del volcán Villarrica está **"en proceso de actualización"** en SENAPRED y hoy **no tiene PDF descargable** (a diferencia de Llaima, Lonquimay y Melipeuco, que sí lo tienen). Lo que sí existe y es usable: el **Visor Chile Preparado** de SENAPRED, un GIS interactivo con capas de *áreas de evacuación, puntos de encuentro y vías de evacuación* descargables en `.shp` y `.kmz` — esta es la fuente georreferenciada real que Vulcania debe consumir, no los planos PDF.
2. **Datos del volcán:** verificables y estables (altura, coordenadas, tipo, historia eruptiva) en la ficha oficial del **Smithsonian GVP**, consultada para esta implementación. La disponibilidad automatizada puede variar y no se debe scrapear en runtime. La página de alertas de **SERNAGEOMIN** no se usa como prueba de estado vigente en este documento; el estado vivo debe verificarse por el canal oficial antes de publicar.
3. **Canales de alerta:** el **SAE** (mensaje a celulares) está bien documentado y es el canal de mayor alcance; SENAPRED publica en 6 redes sociales. Las **radios locales de Pucón no pudieron verificarse** con las herramientas disponibles (una búsqueda confirmó solo que Radio Sinergia es de Osorno, no de Pucón — no inventar frecuencias).

**Lectura estratégica:** Vulcania no debe presentarse como fuente primaria de seguridad. Su rol creíble es **agregador que cita**: muestra el estado oficial con fuente y timestamp, y cuando la fuente no está disponible lo dice ("sin datos oficiales disponibles" + enlace al canal oficial). Esa honestidad es el activo de confianza más valioso del producto.

---

## 2. Zonas seguras y planos de evacuación de Pucón

### 2.1 Hallazgos verificados

**SENAPRED mantiene un índice nacional de planos de evacuación por comuna.** La página describe que cada plano contiene "las vías de evacuación, puntos de encuentro, área de evacuación, entre otros elementos, relacionados con una o más amenazas".
- Fuente: https://www.senapred.cl/planos-de-evacuacion/ (VERIFICADO)

**Región de La Araucanía — el plano del Volcán Villarrica está en actualización.** La página regional lista el plano del **Volcán Villarrica marcado "en proceso de actualización" sin enlace de descarga**, mientras que sí ofrece PDF descargables para **Volcán Llaima, Volcán Llaima–Melipeuco y Volcán Lonquimay** (alojados en el repositorio `bibliogrd.senapred.gob.cl`). La sección tsunami lista Carahue, Saavedra, Teodoro Schmidt y Toltén — ninguna es Pucón.
- Fuente: https://www.senapred.cl/planos-de-evacuacion-la-araucania/ (VERIFICADO)
- **Implicancia:** el plano comunal de Pucón que el brief asume como disponible no lo está hoy en formato descargable. Es la brecha N.º 1 de datos.

**Visor Chile Preparado — la única fuente georreferenciada real.** Visor GIS interactivo de SENAPRED que permite consultar por dirección (calle, número, comuna) la exposición a tres amenazas (volcánica, incendios forestales, tsunami) y visualiza capas de **"Áreas de evacuación, puntos de encuentro, vías de evacuación"**, infraestructura crítica (escuelas, centros de salud, Bomberos y Carabineros), red vial y topografía. Los datos provienen de **SERNAGEOMIN, CONAF, IGM y municipios**, y las capas se descargan en **`.shp` y `.kmz`** (formatos GIS con coordenadas, no PDF).
- Fuente: https://www.senapred.cl/visor-chile-preparado/ (VERIFICADO)
- **Implicancia:** aquí están los puntos de encuentro y vías de evacuación de Pucón si es que existen como capa; es la fuente que Vulcania debe integrar (los PDF no son georreferenciables).

**Municipalidad de Pucón: sin contenido extraíble.** `https://www.munipucon.cl/` es una aplicación JavaScript (SPA) que devuelve una página vacía a los clientes que no ejecutan JS; no hay sitemap XML (`/sitemap.xml` → 404). No fue posible extraer el plan comunal de emergencia ni zonas seguras desde el sitio municipal.
- Fuente: https://www.munipucon.cl/ (BLOQUEADO — SPA sin contenido indexable)
- **Implicancia:** si la municipalidad publica planos, hoy no son accesibles programáticamente; Vulcania necesitaría el archivo por otra vía (Visor, SENAPRED regional, o contacto directo).

**Turismo local no comunica seguridad.** `https://www.pucon.cl/` es un directorio turístico puro ("listados y referencias": comer, beber, alojarse, naturaleza, artesanías, actividades). No contiene datos del volcán, zonas seguras, evacuación ni canales de emergencia. Es una brecha de contenido que Vulcania puede ocupar.
- Fuente: https://www.pucon.cl/ (VERIFICADO — ausencia de contenido de seguridad)

**Contexto de riesgo lahar (verificado, útil para el mapa de riesgo):** el artículo de Wikipedia de Pucón cita un estudio de 2014: **la mayor parte del área urbana de Pucón está fuera de las trayectorias posibles de lahares**; el aeropuerto está en zona de bajo peligro; en cambio la ruta internacional al este del aeropuerto y la ruta al oeste hacia la ciudad de Villarrica están en **zona de alto peligro**. La erupción del 3-mar-2015 activó alerta roja en un radio de 10 km y evacuó a **3.385 personas**.
- Fuentes: https://en.wikipedia.org/wiki/Puc%C3%B3n · https://en.wikipedia.org/wiki/Villarrica_(volcano) (VERIFICADO)
- El **Mapa de peligro del volcán Villarrica** (Hugo Moreno, 2000, Sernageomin) está citado en la Wikipedia en español de Pucón: https://es.wikipedia.org/wiki/Puc%C3%B3n (VERIFICADO — referencia bibliográfica, el mapa en sí no descargable desde ahí)

### 2.2 Tabla de zonas seguras encontradas

| Elemento | Estado | Formato | Fuente (URL) |
|---|---|---|---|
| Plano de evacuación Volcán Villarrica (SENAPRED Araucanía) | **EN ACTUALIZACIÓN — sin PDF descargable** | — | https://www.senapred.cl/planos-de-evacuacion-la-araucania/ |
| Plano Volcán Llaima | Verificado, descargable (formato de referencia) | PDF | https://www.senapred.cl/planos-de-evacuacion-la-araucania/ |
| Plano Volcán Llaima – Melipeuco | Verificado, descargable | PDF | https://www.senapred.cl/planos-de-evacuacion-la-araucania/ |
| Plano Volcán Lonquimay | Verificado, descargable | PDF | https://www.senapred.cl/planos-de-evacuacion-la-araucania/ |
| **Visor Chile Preparado** — áreas de evacuación, puntos de encuentro, vías de evacuación (amenaza volcánica, por comuna/dirección) | Verificado, operativo | GIS interactivo; descargas `.shp` y `.kmz` | https://www.senapred.cl/visor-chile-preparado/ |
| Mapa de peligro del volcán Villarrica (Moreno, 2000, Sernageomin) | Referenciado (documento no accesible en línea) | Mapa (citado) | https://es.wikipedia.org/wiki/Puc%C3%B3n |
| Área urbana de Pucón fuera de trayectorias de lahar; rutas este del aeropuerto y oeste a Villarrica en alto peligro (estudio 2014) | Verificado (resumen) | Estudio | https://en.wikipedia.org/wiki/Puc%C3%B3n |
| Puntos de encuentro concretos en Pucón (Estadio Pucón, plazas, recintos deportivos) | **POR VERIFICAR** — hipótesis del brief sin fuente; consultar las capas del Visor Chile Preparado | — | — |

**Lo que falta:** nombres georreferenciados de recintos específicos (Estadio, plazas) como "puntos de encuentro oficiales". No fue posible confirmarlos con las herramientas disponibles. **Acción de datos:** descargar las capas `.shp`/`.kmz` del Visor para la comuna de Pucón y extraer los puntos de encuentro reales antes de publicar cualquier mapa.

---

## 3. Datos técnicos del volcán Villarrica

### 3.1 Fuentes y accesibilidad

- **Smithsonian GVP** (`https://volcano.si.edu/volcano.cfm?vn=357120`): **VERIFICADO en consulta oficial actual** para la ficha curada (2.847 m, -39,42 / -71,93, estratovolcán, 152 periodos confirmados y periodo 2014-2025 VEI 3). Clientes automatizados pueden recibir HTTP 403; por eso la app carga un seed con fecha y enlace, no un scraper de runtime.
- **Sernageomin** (`https://www.sernageomin.cl/red-nacional-de-vigilancia-volcanica/`): **BLOQUEADO** — "unable to verify the first certificate" con `www` y conexión rechazada (ECONNREFUSED) sin `www`. El sitio institucional no valida TLS, mismo diagnóstico que la auditoría cfo (que sí pudo leer la página vía `curl`; desde este entorno no fue posible). **El nivel de alerta vigente del Villarrica no es verificable hoy desde aquí.**
- **Wikipedia EN** (`https://en.wikipedia.org/wiki/Villarrica_(volcano)`): VERIFICADO — corroboración completa de datos técnicos.

### 3.2 Tabla de datos del volcán compilados

| Dato | Valor | Fuente | Estado |
|---|---|---|---|
| Altura cumbre | **2.847 m** (GVP, primaria) · 2.860 m (Wikipedia) — discrepancia de ~13 m entre fuentes; publicar la de GVP con nota | https://volcano.si.edu/volcano.cfm?vn=357120 · https://en.wikipedia.org/wiki/Villarrica_(volcano) | VERIFICADO en GVP; discrepancia secundaria documentada |
| Coordenadas | **39°25′15″S 71°56′21″W** (≈ -39,42 / -71,93) | https://en.wikipedia.org/wiki/Villarrica_(volcano) | VERIFICADO |
| Tipo | **Estratovolcán** basáltico-andesítico; parte de la Zona Volcánica Sur (falla Mocha-Villarrica) | https://en.wikipedia.org/wiki/Villarrica_(volcano) | VERIFICADO |
| Rasgo distintivo | **Lago de lava activo intermitente** en el cráter (uno de los pocos volcanes del mundo con uno); actividad estromboliana con piroclastos incandescentes y coladas de lava | https://en.wikipedia.org/wiki/Villarrica_(volcano) | VERIFICADO |
| Frecuencia eruptiva | **+82 erupciones desde 1558** | https://en.wikipedia.org/wiki/Puc%C3%B3n | VERIFICADO como fuente secundaria; no reconciliado con GVP (152 periodos) y no cargado como dato oficial |
| Último gran evento | **3-mar-2015, VEI 2**: explosión violenta a las 03:01 h; alerta roja en radio de 10 km; **3.385 personas evacuadas**; precedida de alertas amarillas el 7 y 17 de febrero | https://en.wikipedia.org/wiki/Villarrica_(volcano) | VERIFICADO como fuente secundaria; GVP vigente resume el periodo 2014-2025 como VEI 3; no cargado sin reconciliación |
| Última erupción | **2025** (infobox de Wikipedia; el cuerpo del artículo no la detalla — marcado como "update needed") | https://en.wikipedia.org/wiki/Villarrica_(volcano) | VERIFICADO con caveat |
| Eventos históricos letales | 1963–64: lahares mataron 27 vecinos de Coñaripe · 1971–72: lahares en la cuenca del río Trancura, ≥15 muertes | https://en.wikipedia.org/wiki/Villarrica_(volcano) | VERIFICADO |
| Riesgo principal | **Lahares** por lluvia + deshielo de ~40 km² de glaciares (perdió 25 % de superficie glaciar entre 1961 y 2003) | https://en.wikipedia.org/wiki/Villarrica_(volcano) | VERIFICADO |
| Distancia a Pucón | ~17 km al sur; Pucón a 227 m s.n.m. en la orilla este del lago | https://en.wikipedia.org/wiki/Puc%C3%B3n | VERIFICADO |
| Nivel de alerta vigente (verde/amarillo/naranja/rojo) | **No verificable en esta auditoría** (Sernageomin inaccesible) | https://www.sernageomin.cl/ | BLOQUEADO |
| Sistema de alerta por colores | Existe "semáforo volcánico" referenciado para Pucón | https://es.wikipedia.org/wiki/Puc%C3%B3n | VERIFICADO (referencia) |

---

## 4. Canales oficiales de alerta

### 4.1 Sistema de Alerta de Emergencia (SAE) — el canal de mayor alcance

El **SAE** envía mensajes a **todos los celulares compatibles** dentro del polígono de antenas de telefonía definido para la emergencia (tsunamis, incendios forestales, **erupciones volcánicas**, aluviones). Quien lo activa es SENAPRED, y los mensajes llegan automáticamente sin registro previo. Se realizan **pruebas semanales los miércoles y jueves a las 11:00 h** (desde 2021; en 2026 en 65 comunas), con formato de mensaje "SENAPRED: PRUEBA del Sistema de Alerta de Emergencia para [comuna]". Las fallas de recepción se reportan en `https://www.subtel.gob.cl/sae/` (dentro de 48 h de la prueba).
- Fuente: https://www.senapred.cl/pruebas-sae/ (VERIFICADO)

**Implicancia para Vulcania:** el SAE es el canal con el que el usuario real recibirá una alerta de erupción. Vulcania debe **educar sobre qué es y cómo se recibe** (no se suscribe, llega solo) y **nunca duplicarlo a medias**: si Vulcania emite su propia "alerta" sin el SAE oficial detrás, erosiona el sistema.

### 4.2 Canales oficiales de SENAPRED

Redes sociales oficiales (footer del sitio): **Facebook, Instagram, X/Twitter, YouTube, canal de WhatsApp y Telegram (@SenapredChile)**. Secciones de preparación: "Kit de Emergencia", "Familia Preparada", "Pruebas SAE", "Simulacros", "Recomendaciones" (con página dedicada a "Erupciones Volcánicas" dentro de https://www.senapred.cl/recomendaciones/).
- Fuente: https://www.senapred.cl/ (VERIFICADO)

### 4.3 Números de emergencia (estándar nacional)

| Servicio | Número |
|---|---|
| SAMU (ambulancia) | **131** |
| Bomberos | **132** |
| Carabineros | **133** |
| PDI | **134** |
| CONAF (incendios forestales) | **130** |

Provenientes del brief + estándar oficial chileno. La verificación directa en la página de recomendaciones de SENAPRED **no fue posible** (sus subpáginas redirigen a la portada — sitio SPA). **Acción:** antes de producción, confirmar los números contra una página oficial alcanzable y presentarlos como enlaces `tel:` con disclaimer.

### 4.4 Radios locales de Pucón — **brecha de datos**

No fue posible verificar ninguna radio local de Pucón con las herramientas disponibles:
- `https://www.pucon.cl/?s=radio` → sin resultados ("no podemos encontrar lo que buscas").
- La lista de radioemisoras de La Araucanía de Wikipedia → 404.
- **Radio Sinergia** (`https://radiosinergia.cl/`) resultó ser de **Osorno (104.5 FM), no de Pucón** — descartada; sirve como aviso de no asumir por nombre.
- **Radio Mirador** (Villarrica) → error de certificado TLS, sin verificar.

**Regla:** no publicar frecuencias de radio sin fuente verificada. Marcar el módulo "radios locales" como pendiente de verificación manual (las radios en Chile se verifican contra `fnta.cl`/comunicaciones o consulta directa).

---

## 5. Análisis de contenido: cómo comunicar para ser creíble y útil

### 5.1 Principios de credibilidad (no negociables)

1. **"Datos referenciales" visible en todo dato dinámico** (estado de alerta, zonas, eventos). Texto tipo: *"Datos referenciales, no oficiales. Fuente: Sernageomin · actualizado 2026-08-16 10:00"*. La combinación **fuente + timestamp** es lo que separa a Vulcania de un memé de redes.
2. **Citar siempre la fuente primaria** con enlace (SENAPRED, Sernageomin, SAE). Nunca afirmar un estado de alerta sin el reporte oficial detrás.
3. **Frente a fuente caída: transparencia, no silencio.** Si Sernageomin no responde, mostrar "sin datos oficiales disponibles" + botón de llamada/enlace al canal oficial. Un estado de alerta inventado para "no dejar la pantalla vacía" es el peor error posible en un producto de seguridad.
4. **Frecuencia de actualización declarada por tipo de dato:**
   - Datos estáticos del volcán (altura, tipo, coordenadas, historia): revisión anual.
   - Estado de alerta: con cada reporte oficial (reportes de actividad volcánica de Sernageomin / comunicados de SENAPRED).
   - Zonas seguras y planos: cuando SENAPRED publique el plano de Pucón (hoy "en proceso de actualización") o cambie las capas del Visor.
5. **Georreferenciación solo con fuentes GIS.** Los planos PDF de SENAPRED no traen lat/long; las capas del **Visor Chile Preparado (`.shp`/`.kmz`)** sí. Los mapas de Vulcania deben construirse sobre esas capas y señalar el origen ("punto de encuentro según SENAPRED" vs "sugerido por la comunidad").
6. **Diferenciar "oficial" de "comunitario"** en todo mapa: marcar los puntos de encuentro oficiales de forma distinta a las sugerencias de vecinos. Una zona mal señalada como "segura" puede costar una vida y demandas.
7. **Educar sobre el SAE** (llega solo, no se suscribe, atento a las pruebas semanales) — es la pieza de contenido con mayor valor de seguridad real para turistas.

### 5.2 Qué atrae a cada audiencia

| Contenido | Turista | Vecino |
|---|---|---|
| "Qué hacer si suena la alarma" (checklist 3 pasos: radio/SAE, evacuar a pie, punto de encuentro) | ★★★★★ | ★★★ |
| Mapa "¿dónde estás?" — posición + distancia al cráter + tiempo estimado de llegada de lahar | ★★★★★ | ★★★ |
| Datos del volcán como curiosidad verificable (lago de lava, periodo eruptivo 2014-2025, 152 periodos GVP) | ★★★★★ | ★★ |
| Estado de alerta oficial con timestamp e historial de cambios | ★★★ | ★★★★★ |
| Avisos de pruebas SAE y simulacros (fechas del calendario 2026) | ★★ | ★★★★★ |
| Planos de evacuación y zonas seguras cuando existan | ★★★★ | ★★★★★ |
| Kit de emergencia y preparación familiar (enlace a guías SENAPRED) | ★★ | ★★★★ |
| Radios locales y canales oficiales (Telegram/WhatsApp SENAPRED) | ★★ | ★★★★ |

**Lectura:** el turista compra contexto y calma ("¿estoy en zona de riesgo? ¿qué hago si pasa?"); el vecino compra exactitud y anticipación ("¿cambió el nivel? ¿cuándo es la prueba?"). La misma pantalla de estado puede servirlos a ambos si el contenido se ordena por prioridad: **estado oficial arriba, mapa de riesgo al medio, educación abajo**.

---

## 6. Anexo técnico: brechas y bloqueos para el equipo de datos

| Fuente | Estado | Error | Acción sugerida |
|---|---|---|---|
| volcano.si.edu (GVP, vn=357120) | PARCIAL | La consulta oficial actual es accesible, pero clientes automatizados pueden recibir HTTP 403 | Mantener el seed curado con fecha/enlace; no scrapear GVP en runtime; revalidar manualmente |
| sernageomin.cl (RNVV / alertas) | BLOQUEADO | Cert TLS inválido (`www`); ECONNREFUSED (sin `www`) | Monitorear el estado del sitio; el cfo pudo leerlo vía `curl` — validar el nivel de alerta actual manualmente antes del lanzamiento |
| munipucon.cl | BLOQUEADO | SPA JavaScript, contenido vacío; sin sitemap | Contacto directo con la municipalidad o esperar publicación del plano en SENAPRED |
| web.archive.org | BLOQUEADO | WebFetch rechaza el dominio | N/A |
| senapred.cl subpáginas de recomendaciones | PARCIAL | Redirigen a la portada (SPA) | Consumir solo las páginas que responden (planos, visor, SAE) |
| Radios locales de Pucón | POR VERIFICAR | Sin fuente alcanzable; Radio Sinergia era de Osorno | Verificación manual contra registro oficial de radiodifusoras |
| Plano de evacuación Pucón/Villarrica | EN ACTUALIZACIÓN | Sin PDF en SENAPRED regional | Integrar capas del Visor Chile Preparado; re-verificar el plano periódicamente |
| Puntos de encuentro concretos de Pucón (Estadio, plazas) | POR VERIFICAR | Hipótesis del brief sin fuente | Extraer de las capas `.shp`/`.kmz` del Visor antes de publicar |

**Prioridad de integración (por valor/riesgo):** (1) estado de alerta oficial con fuente y timestamp, (2) capas GIS del Visor para zonas seguras, (3) SAE + números de emergencia como contenido educativo, (4) datos estáticos del volcán (anual), (5) plano comunal de Pucón (cuando exista) y radios (verificación manual pendiente).
