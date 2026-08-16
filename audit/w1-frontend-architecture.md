# Auditoría Frontend — W1: Arquitectura

**Proyecto:** vulcania-web (Next.js 15.5 App Router, React 19, Tailwind 3 + shadcn/ui, Leaflet, Supabase + demo mode)
**Fecha:** 2026-08-16
**Modo:** solo lectura, sin modificaciones al repo.

## Alcance (whitelist)

Archivos leídos íntegramente (14):
- `app/layout.tsx`, `app/page.tsx`, `app/error.tsx`, `app/globals.css`
- `components/interactive-map.tsx`, `components/volcano-status-banner.tsx`, `components/chat-component.tsx`, `components/admin-panel.tsx`, `components/community-panel.tsx`, `components/login-screen.tsx`, `components/emergency-modal.tsx`
- `contexts/auth-context.tsx`, `hooks/use-admin-panel.ts`, `hooks/use-toast.ts`, `hooks/use-mobile.tsx`
- `tailwind.config.ts`, `components.json`

## Método

- Lectura completa de cada archivo del whitelist (línea por línea, refs exactas abajo).
- Verificación por `rg` (sin leer contenido fuera del whitelist): conteo de `aria-*`, `any`, imports de `use-toast`/`use-mobile`/`toaster`, handlers de teclado.
- Conteo de líneas con `wc -l` (monstruos confirmados: interactive-map 825, volcano-status-banner 1075, chat-component 762, admin-panel 673, community-panel 475).
- Verificación del changelog de React 19 (eliminación de `onKeyPress`) contra la documentación oficial.
- Refs de `page.tsx`, `layout.tsx` y `globals.css` conservadas de la lectura previa al compactado; marcadas con `~` cuando el offset exacto no pudo re-verificarse en esta pasada.

---

## Hallazgos numerados

**1. [P0][security] `components/login-screen.tsx:46-47` + `contexts/auth-context.tsx:91-323` — el login "simula el envío de SMS" (`await new Promise(r => setTimeout(r, 2000))`) sin enviar ni verificar ningún código; la identidad es un lookup de teléfono con fuzzy-matching de variantes. — Cualquier persona que conozca un número existente en `usuarios` entra como ese usuario; con el hallazgo 2, eso escala a operador de alertas (puede emitir una falsa "emergencia roja" que dispara la modal crítica y el sonido de alerta en toda la app). — Usar la auth por OTP de Supabase (`signInWithOtp`/`verifyOtp`) o un código real; nunca tratar un lookup de teléfono como autenticación.**

**2. [P0][security] `components/admin-panel.tsx:376-672` + `hooks/use-admin-panel.ts:16` — el panel de administración se abre con Ctrl+Shift+A para CUALQUIER usuario autenticado; `AuthContextType` no tiene campo de rol y no existe ningún chequeo de autorización en el whitelist. — Cualquier usuario (o suplantador, ver hallazgo 1) puede cambiar el nivel de alerta (insertando filas nuevas, línea 280-307), marcar puntos de encuentro como llenos (201-234), resetearlos (236-264) y eliminar mensajes comunitarios (151-186). El riesgo real depende de `APP_CONFIG.enableAdminPanel`/`demoReadOnly` (fuera del whitelist). — Agregar columna de rol en `usuarios`, gate en `useAdminPanel` y en cada mutación (chequeo cliente + RLS servidor; la auditoría de backend debe cubrir RLS).**

**3. [P1][emergency UX] `components/volcano-status-banner.tsx:990-1072` + `components/emergency-modal.tsx:260-356` (montado en `app/layout.tsx`) — existen DOS modales de alerta crítica: el banner monta el suyo propio y `EmergencyModal` el suyo; ambos se suscriben a `alertas_volcan`. — En una alerta naranja/roja pueden abrirse dos modales apilados con flujos de "Entendido" independientes, en el momento de mayor estrés del usuario. — Una sola fuente: `EmergencyModal` global en el layout; el banner solo debe notificar (badge/sonido), no montar modal.**

**4. [P1][broken feature] `components/chat-component.tsx:744` — `onKeyPress` fue eliminado en React 19 (el evento sintético `keypress` ya no existe; verificado contra el changelog oficial). — "Enviar con Enter" es un no-op silencioso: el usuario pulsa Enter y no pasa nada. — Reemplazar por `onKeyDown` (con `e.key === "Enter"` y `preventDefault`).**

**5. [P2][a11y] cero `aria-*` — verificado por `rg`: ningún atributo `aria-*` en `app/` ni en los 7 componentes de feature (solo las primitivas shadcn `components/ui/*` aportan `role="alert"` y clases de focus). — Lectores de pantalla no accesibles: botones solo-icono (`X`, `Trash2`, `ImagePlus`, sonido, cierre modal) sin nombre, badges de no-leídos sin anuncio, la lista de conversaciones es un `div` con `onClick` sin `role`/`tabIndex` (`chat-component.tsx:525-593`) → inoperable por teclado, modales sin focus trap ni `aria-modal`. — `aria-label` en botones icon-only, `role="button"`+`tabIndex`+`onKeyDown` en tarjetas clicable, `aria-live` para alertas y badges, `role="dialog"`+`aria-modal` con focus trap en los modales.**

**6. [P2][a11y/motion] `app/globals.css:~6-27,~155` + `html { scroll-behavior: smooth }` — sin `prefers-reduced-motion`: `animate-pulse`/`animate-bounce`/scroll suave sin guarda, y la sirena Web Audio se repite cada 3-4 s sin respetar preferencias del usuario. — Riesgo vestibular/fotosensibilidad, agravado porque es justamente el contenido de emergencia el que más anima. — Envolver animaciones y el sonido en `prefers-reduced-motion`.**

**7. [P2][theming] `app/globals.css:~6-27` — tokens HSL dark-only en `:root` sin variantes `.dark` ni pares light; componentes con `bg-gray-900`/`bg-black`/`text-white` hardcodeados en los 7 componentes. — Un tema claro (o modo claro del SO) es imposible sin tocar todos los archivos; el `darkMode: ["class"]` del `tailwind.config.ts:5` es decorativo. — Definir pares light/dark en `:root`/`.dark` y migrar a tokens (`bg-background`, `bg-card`, `text-foreground`).**

**8. [P2][coordinación de refresco] `app/page.tsx:~25,~80,~111,~115,~129` — coordinación por prop-drilling (`onAlertChange` → AdminPanel) + remount por `key={`status-${refreshKey}`}` / `key={`map-${refreshKey}`}` / `key={`community-${refreshKey}`}`. — Cambiar un punto en el panel destruye y recrea el mapa Leaflet completo (pérdida de vista/zoom, re-init con 3 `setTimeout` de `invalidateSize`), y remonta chat/comunidad perdiendo su estado local (conversación abierta, draft). — Estado global por dominio (Zustand/context) con versionado selectivo, o confiar en las suscripciones realtime que ya existen y refrescar solo el dato afectado.**

**9. [P2][perf/estabilidad] `components/interactive-map.tsx:193-351,265-278` — init de Leaflet con `setTimeout(50/200/500ms)` de `invalidateSize` y recreación completa del mapa al cambiar de ubicación (`ubicacionSeleccionada` en deps), con la lógica centro/zoom duplicada (224-240 y 666-683). — Renderizado flaky (los delays son magia que depende del layout), doble trabajo de init por cambio de vista. — `react-leaflet` o, mínimo, `map.setView()` sin re-crear la instancia y `invalidateSize` con `ResizeObserver`.**

**10. [P2][data integrity] `components/interactive-map.tsx:354-647` — el effect de marcadores vuelve a correr (deps `puntosEncuentro`, `mapReady`, ...) sin limpiar los marcadores previos; no hay `clearLayers()` ni `layerGroup`. — Una recarga de datos duplica los marcadores sobre el mapa. — Mantener un `L.layerGroup` y limpiarlo antes de repoblar.**

**11. [P2][security/XSS surface] `components/interactive-map.tsx:464-590` — popups de Leaflet como strings HTML crudos con `onclick` inline (`window.open` a Google Maps) e interpolación sin escape de `punto.nombre`/`punto.direccion` (datos de Supabase). Además, carácter corrupto `�` (mojibake) en la etiqueta del botón "Navegar" (línea 551). — Superficie de XSS si un valor de la DB llega a contener markup; los `onclick` inline rompen cualquier CSP y quedan fuera del sistema de eventos de React. — Renderizar popups como nodos React (montar con `createRoot` en el evento `popupopen`, o `react-leaflet` con `<Popup>`), y limpiar el mojibake.**

**12. [P2][reliability] `components/interactive-map.tsx:29-91` — inyección de CSS en runtime: elimina TODOS los `link[href*="leaflet"]` del documento (líneas 32-33), crea `<style>` a mano e inserta `<link>` a `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` sin SRI. — Si unpkg falla, el mapa queda sin estilo; borrar links ajenos del DOM es destructivo; dependencia CDN en runtime no versionada ni integra. — `import("leaflet/dist/leaflet.css")` una sola vez (lo resuelve el bundler) o el CSS en `globals.css`; eliminar la manipulación global del DOM.**

**13. [P2][perf] `components/volcano-status-banner.tsx:302-413` — `cargarDatosVolcan` hace 7 queries secuenciales (alerta → parametros → configuracion → recomendaciones → zona → acciones → volcán), y se re-ejecuta completa ante cada evento realtime (538-616). — 7 RTT por carga; con cambios frecuentes de parámetros, tráfico multiplicado. — Joins vía FK en una o dos queries (o `Promise.all` sobre las independientes) y suscripción única.**

**14. [P2][data growth] `components/admin-panel.tsx:280-307` — `cambiarNivelAlerta` INSERTA una fila nueva en `parametros_volcan` y `alertas_volcan` por cada clic en un nivel; `volcan_id` se resuelve con un `await` anidado dentro de un literal de objeto. — La tabla de alertas crece sin límite (cada simulación deja un registro histórico involuntario). — `UPDATE` del registro vigente (o upsert); resolver el `volcan_id` antes del insert.**

**15. [P2][perf] `components/chat-component.tsx:114-166` — N+1: por cada usuario de la lista, una query de último mensaje (`Promise.all` pero igual N consultas). — Degrada con muchos usuarios; cada carga de la lista dispara N RTT. — Vista materializada/RPC agregada, o una sola query con `DISTINCT ON (emisor/receptor)`.**

**16. [P2][data model] `components/chat-component.tsx:429-430` + `components/community-panel.tsx:202-206` — las imágenes se guardan como data URL base64 dentro del campo `mensaje` (`fileToDataUrl`), sin límite de tamaño ni recompresión (`isImageFile` solo valida tipo). — Payload enorme por imagen en la DB y en cada fetch de mensajes; un usuario puede inflar la tabla con fotos de cámara (multi-MB). — Supabase Storage + URL pública; límite de MB, recompresión y preview con `URL.createObjectURL`.**

**17. [P2][observability] `contexts/auth-context.tsx` (~25 llamadas: 87, 93, 115, 119, 125, 137, 145, 154, 165, 173, 195, 206, 219, 240, 253, 266, 271, 282, 288, 297, 307, 317, 320) — `console.log/error` con emojis y datos completos (teléfonos, usuarios) que se empaquetan en producción; `interactive-map.tsx:116-117` además loguea el prefijo de la URL de Supabase. — Ruido y fuga de PII a la consola del navegador en prod (los `logger.debug` del resto usan `lib/logger`, cuyo comportamiento en prod no está en el whitelist; los `console.*` de auth-context son incondicionales). — Unificar en `logger` con nivel info/off en producción; eliminar los logs de datos sensibles.**

**18. [P2][error UX] `contexts/auth-context.tsx:301-311,319-322` — el login falla con `return false` sin razón estructurada; `login-screen.tsx:52` muestra un mensaje genérico. — Imposible diagnosticar desde la UI ("Error al iniciar sesión" no dice si fue red, formato o inexistencia). — Devolver un motivo tipado y mostrarlo.**

**19. [P2][maintainability] código duplicado: `createAlertSound` (banner 101-147 vs emergency-modal 21-74, ya divergen en patrón/frecuencia), `calcularTiempoTranscurrido` (banner 87, admin-panel 188, community-panel 253), `formatearFecha`/`formatearHora` (banner 75, chat 475). — Los fixes divergen y se corrigen dos veces. — `lib/sound.ts` y `lib/time.ts` compartidos (ver plan de split del banner).**

**20. [P3][perf] `components/emergency-modal.tsx:148-215` — polling de la alerta cada 5 s mientras el banner usa realtime para lo mismo. — Dos mecanismos redundantes para un mismo dato; con el hallazgo 3 se unifican en un solo suscriptor realtime.**

**21. [P3][a11y] `hooks/use-admin-panel.ts:16` — Ctrl+Shift+A sin chequeo de `event.target`: el panel se abre mientras el usuario escribe en un input. — Interrupción del flujo de escritura. — Ignorar el shortcut si el target es un campo editable.**

**22. [P3][ux] `alert()`/`confirm()` bloqueantes: admin-panel.tsx:153,159,319,322; community-panel.tsx:175. — Diálogos nativos que bloquean el thread y no son consistentes con el diseño. — Usar toasts (ver hallazgo 23: la infraestructura ya existe, está muerta).**

**23. [P3][dead code] `hooks/use-toast.ts` + `hooks/use-mobile.tsx` + `components/ui/toaster.tsx` — verificado por `rg`: nada importa `useToast`/`useIsMobile`; `toaster.tsx` importa `use-toast` (ciclo muerto) y `layout.tsx` no monta `<Toaster/>`. — ~210 líneas muertas y la app no tiene sistema de feedback (los `alert()` del hallazgo 22 son el síntoma). — Montar `<Toaster/>` en el layout y migrar los `alert()`, o borrar los tres archivos.**

**24. [P3][metadata] `app/layout.tsx:~11` — `metadata.generator: "v0.dev"` (atribución del generador de la UI); tampoco hay `export const viewport` (theme-color). — Fingerprint de la herramienta en el HTML y sin color de barra móvil. — Eliminar `generator`, agregar `viewport`.**

**25. [P3][fonts] `app/layout.tsx:~25` — `body className="font-sans"` (stack del sistema); sin `next/font`. — Tipografía no controlada entre plataformas. — `next/font/google` (Inter).**

**26. [P3][dev leftover] restos de desarrollo en producción: `emergencyData` falso hardcodeado (`volcano-status-banner.tsx:165-239`, solo usado por `forceEmergency`); botón "Reset" de debug en la UI de chat (`chat-component.tsx:507-514`); texto helper que muestra el input en vivo (`login-screen.tsx:159-160`); `setError("")` duplicado (`login-screen.tsx:43-44`); copy engañoso "Enviando SMS..." sobre un delay falso (`login-screen.tsx:46-47,182`). — Ruido y mensajes falsos para el usuario real. — Limpiar.**

**27. [P3][code] `tailwind.config.ts:10` — glob raíz `"*.{js,ts,jsx,tsx,mdx}"` escanea archivos fuera de `app/`/`components/`. — Content scanning ancho e inútil. — Quitar el catch-all.**

**28. [P3][maintainability] `app/globals.css:~63-83` — guerra de z-index global con `!important` (`[data-radix-popper-content-wrapper]`, `[role="dialog"]`, overlays 9998/9999 vs `.leaflet-container { z-index: 1 !important }`). — Frágil ante cualquier overlay nuevo; los modales custom con `z-50` quedan debajo de los diálogos Radix. — Stacking contexts por contenedor (isolate) en lugar de z-index globales.**

**29. [P3][correctness] `components/chat-component.tsx:132-149` — badge de no-leídos hardcodeado a 1 ("Mostrar 1 mensaje no leído sin hacer consultas adicionales"). — El conteo mostrado es incorrecto por diseño. — Query de conteo real (o un solo campo agregado).**

**30. [No reproducido] `any` — la claim previa de uso de `any` NO se confirma: `rg` sobre `app/`, `components/`, `contexts/`, `hooks/` no encuentra `: any`, `as any` ni `any[]`; solo casts tipados (`as "naranja" | "rojo"`, `as VolcanoStatusComplete`, `payload.new as MensajeChat`). Descartar este hallazgo de la lista.**

---

## Plan de división de componentes monstruo

Guía objetivo: **200-300 líneas por archivo**, un hook por dominio de datos, sub-componentes puramente presentacionales. Solo vías que no agregan dependencias nuevas (opcional: `react-leaflet` para el mapa).

### 1. `components/interactive-map.tsx` (825 L) → 6 archivos + 1 lib

| Archivo nuevo | Contenido | LOC objetivo |
|---|---|---|
| `components/map/map-shell.tsx` | Estado de shell (ubicación seleccionada, puntos, loading), layout de badges/selectores/instrucciones | ~120 |
| `components/map/leaflet-map.tsx` | Ciclo de vida de la instancia Leaflet (init, cleanup, `setView`, `invalidateSize` vía ResizeObserver), manejo de layerGroup | ~160 |
| `components/map/punto-marker.tsx` | Marcador individual + binding de popup (montando el popup como nodo React) | ~110 |
| `components/map/map-popup-content.tsx` | Contenido del popup (datos del punto, botones Navegar/Ver RA) como JSX real, sin strings | ~100 |
| `hooks/use-puntos-encuentro.ts` | Carga de puntos + demo mode + validación de coordenadas | ~80 |
| `hooks/use-leaflet-map.ts` | Init/cleanup/invalidate, limpieza de marcadores antes de repoblar | ~90 |
| `lib/map-constants.ts` | Centros/zooms por ubicación (elimina la duplicación 224-240/666-683) | ~30 |

Requiere: eliminar la inyección de CSS runtime (hallazgo 12), pasar popups a React (hallazgo 11), `clearLayers()` (hallazgo 10).

### 2. `components/volcano-status-banner.tsx` (1075 L) → 5 archivos + 2 libs

| Archivo nuevo | Contenido | LOC objetivo |
|---|---|---|
| `components/volcano/volcano-banner.tsx` | Header del banner (título, badges, parámetros, toggle de sonido) | ~150 |
| `components/volcano/volcano-detail-dialog.tsx` | Diálogo "Ver Detalles" (estado, parámetros, recomendaciones, zona) | ~180 |
| `components/volcano/volcano-banner-loading.tsx` | Skeleton de carga | ~40 |
| `hooks/use-volcano-data.ts` | `cargarDatosVolcan` paralelizado (hallazgo 13) + suscripción realtime única | ~120 |
| `hooks/use-alert-sound.ts` | Play/stop de la sirena con intervalo y cleanup | ~80 |
| `lib/sound.ts` | `createAlertSound` (dedupe con emergency-modal, hallazgo 19) | ~60 |
| `lib/time.ts` | `calcularTiempoTranscurrido`/`formatearFecha` compartidos | ~40 |

Eliminar la modal crítica propia (hallazgo 3: la maneja `EmergencyModal` global) y los restos dev (`emergencyData`, `simularCambioNivel`, botones de simulación — mover el simulador a la superficie de admin si se quiere conservar).

### 3. `components/chat-component.tsx` (762 L) → 5 archivos + 2 hooks

| Archivo nuevo | Contenido | LOC objetivo |
|---|---|---|
| `components/chat/chat-shell.tsx` | Conmutación lista↔hilo, header del chat | ~120 |
| `components/chat/conversation-list.tsx` | Lista con badges de no-leídos (accesible: role/tabIndex) | ~140 |
| `components/chat/chat-thread.tsx` | Mensajes + auto-scroll | ~130 |
| `components/chat/message-bubble.tsx` | Burbuja + media + hora | ~80 |
| `components/chat/chat-composer.tsx` | Input + adjuntar imagen + preview (onKeyDown, hallazgo 4) | ~120 |
| `hooks/use-conversations.ts` | Estadísticas sin N+1 (hallazgo 15) | ~110 |
| `hooks/use-chat-thread.ts` | Mensajes + suscripción por hilo + suscripción global | ~130 |

Eliminar el botón "Reset" (hallazgo 26). El conteo de no-leídos pasa a query real (hallazgo 29).

### 4. `components/admin-panel.tsx` (673 L) → 4 archivos + 1 hook

| Archivo nuevo | Contenido | LOC objetivo |
|---|---|---|
| `components/admin/admin-shell.tsx` | Overlay, header, instrucciones | ~80 |
| `components/admin/alert-level-section.tsx` | Grid de niveles + parámetros simulados (upsert, hallazgo 14) | ~150 |
| `components/admin/meeting-points-section.tsx` | Lista de puntos + acciones | ~140 |
| `components/admin/community-messages-section.tsx` | Moderación de mensajes | ~100 |
| `hooks/use-admin-data.ts` | 3 loaders + mutaciones | ~150 |

Requisito transversal: gate de rol (hallazgo 2) y reemplazo de `alert()`/`confirm()` por toasts (hallazgos 22-23).

### 5. `components/community-panel.tsx` (475 L) → 3 archivos + 1 hook

| Archivo nuevo | Contenido | LOC objetivo |
|---|---|---|
| `components/community/community-shell.tsx` | Header + composición | ~60 |
| `components/community/aviso-composer.tsx` | Formulario + imagen (límite de tamaño, hallazgo 16) | ~130 |
| `components/community/aviso-list.tsx` | Lista + tarjeta de aviso (con `aviso-card` inline) | ~150 |
| `hooks/use-avisos.ts` | Carga + realtime + envío | ~90 |

### Cruces entre monstruos (hacer juntos)

- `lib/sound.ts` y `lib/time.ts` sirven a banner, emergency-modal y community/admin.
- `hooks/use-admin-panel.ts` se extiende con el chequeo de rol (hallazgo 2).
- El remount por `key` (hallazgo 8) se elimina cuando cada pantalla refresca su propio dominio.

---

## Fuera de alcance (one-liners)

- `lib/*` (supabase, app-config, demo-data, logger, message-media, browser-notifications, phone-utils): fuera del whitelist; `logger` puede silenciar en prod (los `logger.debug` del mapa/chat), los `console.*` de auth-context no.
- `components/ui/*`: primitivas shadcn estándar; `ui/alert.tsx:28` aporta el único `role="alert"` del sistema.
- `components/map-component.tsx` (11 L) y `components/volcano-status-header.tsx` (185 L): fuera del whitelist; `page.tsx` importa estos wrappers, no los monstruos auditados (los monstruos llegan vía ellos); contenido no verificado.
- RLS y autorización servidor sobre `alertas_volcan`, `avisos_comunidad`, `mensajes_chat`, `usuarios`: lo cubre la auditoría de backend (findings 1-2 dependen de ello).
- Realtime sin reconexión/presencia (channels de Supabase): backend.
- Chat/comunidad sin paginación (limit 20/10): aceptable a esta escala.
- Tests: no se verificó la existencia de suite (fuera del whitelist).

---

## Preguntas abiertas

1. ¿`APP_CONFIG.enableAdminPanel` y `APP_CONFIG.demoReadOnly` están activos en producción? Determina si los hallazgos 1-2 son explotables hoy o solo en modo demo.
2. ¿`lib/logger` es no-op en producción? Determina si el ruido de debug del mapa/banner/chat llega a la consola real.
3. ¿`usuarios` tiene columna de rol? Sin ella, el gate de admin (hallazgo 2) requiere migración de esquema.
4. ¿El login quedó sin OTP adrede para la demo, o se planea auth por teléfono real de Supabase?
5. Los wrappers `map-component.tsx`/`volcano-status-header.tsx`, ¿re-exportan o agregan props a los monstruos?
