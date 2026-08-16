# Auditoría Estratégica — W2: Posicionamiento y Riesgos

**Proyecto:** vulcania-web (plataforma comunitaria de monitoreo volcánico, Chile, UI en español, MIT, cívica, demo mode para showcase)
**Fecha:** 2026-08-16
**Base de evidencia:** lectura íntegra de `audit/w1-frontend-architecture.md`, `audit/w1-defects.md`, `audit/w1-performance.md`, `audit/w1-backend-data.md`. No se ejecutó código; esto es estrategia sobre los hallazgos, no una nueva auditoría técnica.
**Nota:** `audit/w2-product.md` no existe en el directorio `audit/` — salteado según instrucciones.

Referencias entre paréntesis: [FE-n] frontend, [DE-n] defects, [PE-n] performance, [BD-n] backend-data.

---

## 0. Resumen ejecutivo

La idea tiene una posición real y defendible: la capa comunitaria (chat, avisos, puntos de encuentro) sobre el contexto oficial es un hueco que ninguna institución chilena llena hoy. El problema de la ejecución no es estético: es de confianza. La auditoría W1 muestra que hoy **cualquier visitante puede emitir una falsa alerta roja o un falso all-clear** (BD-1/2/3, FE-1/2). Para un producto de seguridad cívica, eso no es deuda técnica: es la negación del producto. Una sola falsa alarma quema la misión, y la demo actual miente ("Enviando SMS..." sobre un delay falso, simulación indistinguible de datos reales, seed que arranca en alerta roja).

Prioridad estratégica: (1) cerrar el piso de confianza, (2) hacer que el camino de emergencia no falle, (3) que la demo sea honesta, (4) piso de ingeniería para que el proyecto MIT sea contribuible, (5) rediseñar con el lenguaje visual de la autoridad. Todo lo demás es después.

---

## 1. Posición frente a los actores institucionales

### El mapa del poder

- **SENAPRED** (ex-ONEMI): la alerta oficial y la respuesta. Autoridad, continuidad, cobertura nacional. No hace hiperlocal ni bidireccional.
- **Sernageomin / RNVV / OVDAS**: la vigilancia científica (sismología, gases, deformación). Precisión de laboratorio, publicación lenta y descendente. No conversa con la población.
- **USGS / GVP**: referencia internacional. No tienen capa local chilena ni capa comunitaria.

### Por qué existe Vulcania

Las instituciones responden "¿cuál es la alerta oficial?". Vulcania responde preguntas que ellas no responden: "¿mi punto de encuentro está lleno?", "¿qué están haciendo mis vecinos?", "¿dónde está realmente seguro hoy?". El dato oficial es el **contexto** (le da credibilidad); la capa comunitaria es el **valor** (hiperlocal, tiempo real, humana). Esa es la posición: empalme de ambas, no competencia con ninguna.

### Defensabilidad

- **Efectos de red por zona volcánica**: el chat y los puntos de encuentro solo valen con masa crítica por zona. Quien llega primero a una zona (Pucón/Villarrica hoy) tiene la red instalada.
- **Moat de datos hiperlocales**: la ocupación de puntos de encuentro y los reportes comunitarios se acumulan por zona y no existen en ningún otro lado. No se replican con un scrape.
- **Costos de cambio emocionales**: en una emergencia la gente usa el canal que ya conoce y en el que ya confía. La confianza es el moat final.
- **MIT + proyecto cívico**: licencia social y contribuciones voluntarias, no un moat por sí sola. Vale mientras el repo sea serio (ver riesgo D).

### Las trampas de posición (evitar)

1. **Competir en monitoreo**: perder. No hay sensores, geólogos ni mandato. Nunca presentar los parámetros como propios.
2. **Comunidad sin contexto oficial**: perder. Sin la autoridad citada, la capa comunitaria es un grupo de WhatsApp con mapa.
3. **Mezclar ambas capas visualmente**: es el error más sutil y el más dañino. Si un reporte de vecino se ve igual que un dato de Sernageomin, la confianza se erosiona en ambos sentidos (BD-11: hoy la simulación es indistinguible de lo real, incluso en el esquema).

La frontera entre capa oficial y capa comunitaria debe ser explícita en la UI. Esa frontera ES el producto.

---

## 2. Riesgos estratégicos encontrados en la auditoría

### A. Riesgo existencial de confianza (life-safety) — P0

Auth falsa (localStorage forjable, BD-3), RLS activo en 1 de 12 tablas (BD-1), panel admin tras Ctrl+Shift+A sin rol (FE-2), inyección de filtros `.or()` (BD-4), directorio completo de usuarios (nombres + teléfonos) descargable por cualquiera (DE-1, BD-7). Consecuencia: suplantación total + publicación de falsa emergencia o falso all-clear + exposición de PII (Ley 19.628). **La confianza ES el producto; hoy el producto es un pasivo.** El hallazgo que el dueño debe leer primero: BD-1.

### B. La demo miente — riesgo de showcase

La demo es el pitch actual, y contradice el pitch: detección de demo duplicada 5x con semánticas divergentes (DE-5), identidad demo triplicada con formato de teléfono inconsistente (BD-18), seed que arranca en nivel rojo con sirena (BD-10), copy falso "Enviando SMS..." (FE-26), timestamps de demo congelados que derivan hacia "hace -3 horas" (PE-12), simulación escrita directamente en tablas de producción (BD-11), restos de dev en la UI (botón Reset, FE-26). Un showcase que se ve roto demuestra "mala ejecución" — justo la crítica que se quiere revertir.

### C. Flujos rotos en el peor momento

Dos modales de alerta crítica apiladas con dos "Entendido" (FE-3), Enter que no envía en React 19 (FE-4), remount completo del mapa por key con flash de 1-2s (FE-8, PE-6), marcadores duplicados sin `clearLayers` (FE-10), mojibake en el botón "Navegar" (FE-11), `alert()`/`confirm()` nativos con la infraestructura de toasts muerta (FE-22/23), sirena con un `AudioContext` nuevo por beep que se apaga sola al agotar el límite del navegador + polling REST de 5s por siempre (PE-2). Todos los defectos de UI de W1 ocurren en el momento de mayor estrés del usuario.

### D. Ingeniería sin red de seguridad

Build ignora errores de lint y tipos (DE-7), sin lockfile y `leaflet: "latest"` (DE-8, PE-9), `next lint` deprecado (DE-9), deploy con npm en un proyecto pnpm (DE-4), suite de tests que no corre (DE-16) y testeando forks en vez del código real (DE-14/15), 1075 líneas de banner muerto en el bundle (PE-0), `metadata.generator: "v0.dev"` y `my-v0-project` (FE-24, DE-12). Un proyecto MIT sin CI no es contribuible: ningún voluntario firma un PR que no tiene gate. Además, supply chain sin fijar.

### E. Datos que no pueden sostener la promesa

Mediciones como VARCHAR con unidades embebidas fabricadas con `random()` (BD-14), sin columna de fuente ni distinción simulación/real (BD-11), sin auditoría de quién cambió la alerta (BD-19), historial de alertas que crece sin límite (FE-14), realtime muerto en instalación fresca por falta de publication (BD-24), modelo fantasma `RutaEvacuacion` (BD-17). La promesa "capa comunitaria sobre monitoreo oficial" exige números y provenance; hoy el esquema no puede recibir datos oficiales aunque llegaran.

### F. Rendimiento en el momento crítico

Bundle monolítico con LCP estimado 3.5-6s (PE-1), 7 queries secuenciales por banner (PE-4), N+1 del chat con refetch completo por cada mensaje (PE-5), imágenes base64 en DB (PE-8). Los dispositivos de una zona de evacuación son Android de gama baja con red saturada. El rendimiento es un requisito de seguridad, no de pulido.

---

## 3. Matriz esfuerzo/impacto — 5 movimientos recomendados

| # | Movimiento | Esfuerzo | Impacto | Por qué |
|---|---|---|---|---|
| 1 | Piso de confianza: identidad real + RLS + rol + auditoría | M | **Existencial** | Hoy cualquiera publica una falsa alerta (BD-1/3, FE-1/2). Sin esto no hay producto que mostrar: hay un pasivo legal y de seguridad pública. |
| 2 | Camino de emergencia a prueba de fallas | S | Muy alto | Los flujos rotos (FE-3/4/8, PE-2) ocurren en el momento que importa. Es mecánico y barato; responde directo a la crítica de "flujos rotos". |
| 3 | Demo mode honesto y coherente | S | Alto | La demo es el pitch (BD-18, FE-26, BD-10). Cuesta días y convierte el showcase de "roto" a "serio". Responde a la crítica de "mal diseño" en lo visible. |
| 4 | Piso de ingeniería: CI + lockfile + gates reales | S–M | Alto | Sin gates no hay contribución (DE-7/8/16), y el proyecto es MIT. Habilita todo lo demás y frena regresiones y supply chain. |
| 5 | Rediseño con lenguaje visual de autoridad | M | Muy alto | La confianza se comunica visualmente (sección 4). Es la inversión más visible; absorbe los resultados de 2 y 3 en la UI. |

### Detalle por movimiento

**1. Piso de confianza (M).** Supabase Auth con OTP de teléfono (reemplaza FE-1), columna `rol` en `usuarios`, RLS en las 12 tablas con políticas por rol (BD-1), gate de admin servidor (FE-2, BD-6), RPCs SECURITY DEFINER como única vía de mutación (BD-25 ya los tiene y el cliente los esquiva), trigger de auditoría extendido a `alertas_volcan` (BD-19), y limpiar el fallback `select("*")` (DE-1). *Por qué es primero:* en seguridad cívica, la primera falsa alarma no cuesta un bug, cuesta el proyecto. Además desbloquea la defensabilidad: la capa comunitaria solo es defendible si la oficial heredada no es corruptible.

**2. Camino de emergencia a prueba de fallas (S).** Un solo modal (EmergencyModal global, FE-3), una sola suscripción realtime y eliminar el poll de 5s (PE-2), un solo `AudioContext` reutilizado (PE-2), `onKeyDown` para Enter (FE-4), eliminar los remounts por `key` (FE-8, PE-6), `clearLayers()` en el mapa (FE-10), montar el `<Toaster/>` y matar los `alert()` (FE-22/23), `prefers-reduced-motion` (FE-6). *Por qué:* es el momento en que el producto debe ser invisible de tan confiable; además es barato y visible, ideal para el ciclo corto de demo.

**3. Demo mode honesto (S).** Fuente única de detección en `lib/app-config.ts` (DE-5), identidad demo única (BD-18), seed en verde (BD-10), columna `es_simulacion`/etiqueta "Simulación — demo" en cada dato (BD-11), eliminar el copy "Enviando SMS..." y los restos de dev (FE-26), timestamps de demo derivados de un session-start ref (PE-12), borrar el banner muerto de 1075 líneas (PE-0). *Por qué:* la demo es lo único que el público ve hoy; un showcase que miente sobre lo que hace demuestra exactamente lo que se quiere negar.

**4. Piso de ingeniería (S–M).** Commitear `pnpm-lock.yaml` y pinner leaflet (DE-8), quitar los ignores del build (DE-7), mover a ESLint CLI (DE-9), CI con `install → lint → tsc --noEmit → test` (DE-16), arreglar el deploy pnpm (DE-4), renombrar `my-v0-project` y quitar el fingerprint v0.dev (DE-12, FE-24), actionlint para el workflow. *Por qué:* sin gate, cada PR futuro reintroduce los defectos de W1; con gate, el proyecto MIT se vuelve contribuible y el showcase puede decir "CI verde".

**5. Rediseño con lenguaje visual de autoridad (M).** Ver sección 4. *Por qué:* la confianza es el producto y se comunica en el primer segundo; el rediseño es la materialización visible de los movimientos 1-3.

### Lo que queda fuera del top 5 (no olvidar, no hacer ya)

- **Split de bundle + TanStack Query** (PE-1/4/5): necesario antes de adopción real; no bloquea la demo.
- **Supabase Storage + límites para imágenes** (FE-16, PE-8): necesario si el chat es real; la demo puede vivir con base64 capado a 500KB.
- **Esquema numérico + provenance** (BD-14): prerequisito de cualquier piloto con datos oficiales; queda detrás de una decisión (ver preguntas abiertas).
- **Ruta de evacuación** (BD-17): implementar o borrar la interfaz; no invertir hasta decidir el piloto.

---

## 4. Lo que el rediseño debe comunicar para generar confianza

Principio: **en una emergencia, la gente obedece lo que parece autoridad.** La UI debe parecerse a la página de SENAPRED, no a un juego. Cada pantalla debe responder "¿quién lo dice?".

1. **Precisión temporal absoluta.** Cada dato con "Actualizado HH:MM:SS (CLT), 16 ago 2026" + relativo. En emergencias, la antigüedad de la información ES información: "sin datos desde las 11:40" debe ser un estado visible, no un silencio. Hoy los timestamps de demo derivan hacia negativo (PE-12) — es exactamente el tipo de falla que mata credibilidad.

2. **Cita de fuentes en cada dato, sin excepción.** "Fuente: Sernageomin RNVV/OVDAS", "Reportado por vecinos (verificado por N)", "Simulación — demo". La capa oficial y la comunitaria nunca se mezclan visualmente: la oficial con tipografía y badges institucionales; la comunitaria claramente etiquetada como humana. La frontera entre ambas es el producto (sección 1).

3. **Escala de alerta oficial, un solo lugar de la verdad.** Semáforo Verde/Amarillo/Naranja/Rojo con los nombres y descripciones oficiales de SENAPRED/Sernageomin, idéntico en banner, badges y modal. Un solo modal crítico, un solo flujo de "Entendido", un solo mecanismo de sonido (FE-3, PE-2). La escala nunca es invento propio.

4. **Calma visual.** Sin `animate-pulse`/`bounce` fuera de la alerta real (FE-6), `prefers-reduced-motion` obligatorio, sin emojis, sin copy juguetón, tipografía institucional sobria (p. ej. IBM Plex, auto-hosted vía `next/font`, PE-11), paleta oscura sobria o clara institucional, nunca neón. La urgencia se reserva para la alerta real: si todo pulsa, nada alerta.

5. **Accesibilidad como autoridad.** `aria-live` para alertas, focus traps en modales, botones con nombre accesible (FE-5). Un lector de pantalla debe poder operar la app a ciegas durante una evacuación; la accesibilidad no es cumplimiento, es el canal de emergencia de una parte de la comunidad.

6. **Transparencia del estado del dato.** En vivo vs simulación vs desactualizado siempre distinguible (BD-11). El rediseño es una afirmación de confianza: la honestidad sobre qué se sabe y qué no es la credibilidad del proyecto cívico.

---

## 5. Fuera de alcance (one-liners) y preguntas abiertas

### Fuera de alcance (decisiones posteriores, no para esta iteración)

- Integración de feeds oficiales reales (Sernageomin/GVP/USGS) — depende de la decisión de piloto y del esquema numérico.
- App móvil nativa y push geofenced.
- Expansión multi-volcán más allá de Pucón/Villarrica.
- Partnership formal con SENAPRED/municipalidad.
- Aspectos legales (Ley 19.628) y estrategia de PR/comunicación.
- Fundraising.

### Preguntas abiertas

1. **¿Demo-only o piloto real?** Determina si el movimiento 1 (auth real + RLS) es esta iteración o la siguiente. La recomendación es que sea esta: es el único movimiento cuyo costo sube con la espera.
2. **¿Quién opera el dashboard de Supabase y sabe que la base está abierta a la anon key?** (BD-1, pregunta BD-6). La respuesta es urgente aunque no se cambie código hoy.
3. **¿Se planea ingerir datos reales de Sernageomin?** Determina el esquema numérico + provenance (BD-14) y si la simulación debe vivir en tablas separadas.
4. **¿Usuarios y dispositivos objetivo del piloto?** Si es Android de gama baja en zona de evacuación, el split de bundle (PE-1) sube de prioridad.
5. **¿Existe un socio comunitario para el efecto de red** (municipalidad de Pucón, junta de vecinos, brigada de emergencia)? Sin masa crítica inicial por zona, el chat y los puntos de encuentro no arrancan solos.
6. **¿Cuál es la fuente de verdad de la escala de alerta** (SENAPRED/Sernageomin vigente) y quién la mantiene al día?
