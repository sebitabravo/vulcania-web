# Vulcania-web — Hallazgos consolidados

Auditoría multi-agente (8 especialistas, 2 oleadas). Fecha: 2026-08-16. Solo lectura; sin cambios de código.
Fuentes: `audit/w1-{frontend-architecture,defects,performance,backend-data}.md` + `audit/w2-{design-research,operations,product,strategy}.md`. Cada hallazgo cita su reporte fuente; duplicados mergeados con la evidencia más fuerte.

## Resumen ejecutivo

La idea (capa comunitaria sobre monitoreo oficial, Chile) tiene posición defendible: ninguna institución hace hiperlocal ni bidireccional. Pero la ejecución no falla estéticamente: falla en **confianza**. Hoy cualquier visitante puede suplantar a un usuario, leer los chats privados y el directorio de teléfonos, y publicar una falsa alerta roja o un falso all-clear. Para un producto de seguridad pública, eso no es deuda técnica: es la negación del producto. Una sola falsa alarma quema la misión.

Prioridad estratégica (recomendación CEO): 1) piso de confianza (auth real + RLS + rol), 2) camino de emergencia a prueba de fallas, 3) demo honesta, 4) piso de ingeniería (CI + lockfile), 5) rediseño con lenguaje visual de autoridad.

---

## P0 — Integridad pública / vida humana

| # | Hallazgo | Evidencia | Fuente |
|---|---|---|---|
| P0-1 | **Login falso**: "Enviando SMS..." es un `setTimeout` de 2s sin verificar nada; la identidad es un lookup de teléfono desde `localStorage["vulcania_usuario"]` forjable (cualquier persona conoce un número y entra como ese usuario; auto-creación de usuarios para teléfonos desconocidos) | `components/login-screen.tsx:46-47`, `contexts/auth-context.tsx:38-41,113,277,315` | frontend #1, backend #3 |
| P0-2 | **RLS apagada en 11 de 12 tablas** (solo `puntos_encuentro` la tiene) con grants anon por defecto: chats privados, nombres+teléfonos, nivel de alerta, avisos: lectura y escritura total desde la anon key del bundle | `scripts/init.sql:314-326` | backend #1, defects #1 |
| P0-3 | **`puntos_encuentro` UPDATE anon sin `WITH CHECK` ni rol**: cualquiera marca todos los puntos LLENO/LIBRE en una emergencia, salteando los RPCs diseñados como vía protegida | `scripts/init.sql:319-326` | backend #2 |
| P0-4 | **Sirena de emergencia puede fallar silenciosa**: `AudioContext` nuevo por beep (límite ~6 en Chrome) + polling REST 5s de por vida redundante con realtime, con el sonido declarado "SIEMPRE debe sonar" y sin control de usuario | `components/emergency-modal.tsx:21-74,148-221` | performance #2, designer P1-A |
| P0-5 | **Números de emergencia invertidos en la modal crítica**: "133 (Bomberos) o 131 (Carabineros)" — el estándar chileno es 131 SAMU / 132 Bomberos / 133 Carabineros; SAMU ausente. La string más crítica del producto desinforma en una crisis | `components/emergency-modal.tsx:350-351` | designer P0-A |

## P1 — Función central rota o en riesgo en emergencia

| # | Hallazgo | Evidencia | Fuente |
|---|---|---|---|
| P1-1 | **Enter no envía en el chat**: `onKeyPress` eliminado en React 19 (no-op silencioso) | `components/chat-component.tsx:744` | frontend #4 |
| P1-2 | **Panel admin sin rol**: Ctrl+Shift+A para cualquier autenticado; mutaciones sin chequeo servidor; el cliente además **saltea los RPCs atómicos** re-implementando con 2 INSERT sin transacción + `Math.random()` | `components/admin-panel.tsx:376-672`, `hooks/use-admin-panel.ts:16`, `admin-panel.tsx:280-307` | frontend #2, backend #6/#25 |
| P1-3 | **Dump de la tabla `usuarios` completa** al browser en cada login fallido (PII + enumeración) | `contexts/auth-context.tsx:167-169`; `chat-component.tsx:111` | defects #1, backend #7 |
| P1-4 | **Realtime muerto en instalación nueva**: falta `alter publication supabase_realtime` en `init.sql`; todo lo "en vivo" es silenciosamente falso hasta configurar el dashboard | `scripts/init.sql` (sin publication) | backend #24 |
| P1-5 | **Sin CI y gates de build apagados**: `eslint.ignoreDuringBuilds` + `typescript.ignoreBuildErrors`; errores de lint/tipo llegan a producción sin ninguna puerta | `next.config.mjs:3-8`; `.github/` solo `reviewer-auto-pr.yml` | defects #7, operations #1/#2 |
| P1-6 | **Sin lockfile** (gitignored, `leaflet: "latest"`): builds no reproducibles, supply-chain sin fijar, CI indeterminista | `.gitignore:36-37`, `package.json:28` | defects #8, operations #3 |
| P1-7 | **Bundle monolítico**: LCP estimado 3.5-6s (Android gama baja en zona de evacuación); `dynamic(() => Promise.resolve(...))` no code-splitea; supabase-js paga el login; CSS de Leaflet desde unpkg en runtime (dependencia de terceros para una UI de emergencia) | `app/page.tsx:1-15`, `interactive-map.tsx:29-91,813-823` | performance #1/#3 |
| P1-8 | **Modal crítica duplicada** (latente): el banner muerto de 1075 líneas monta su propia modal con sonido propio; si se revive, dos overlays apilados con dos "Entendido" | `components/volcano-status-banner.tsx:990-1072` (muerto) + `emergency-modal.tsx:260-356` | frontend #3, PM §2 |
| P1-9 | **`volcano-status-banner.tsx` (1075 L) es código muerto** (cero referencias) — el banner vivo es `volcano-status-header.tsx`; el código muerto conserva el riesgo de la modal duplicada y de las 7 queries | grep: 0 referencias | performance (corrección), PM §2 |
| P1-10 | **Instalación nueva arranca en alerta ROJO con sirena** (seed "NIVEL CRÍTICO PARA PRUEBAS") — un entorno mal configurado simula una emergencia real | `scripts/init.sql:348-351` | backend #10 |
| P1-11 | **Inyección de filtros `.or()`** por interpolación de IDs forjados | `components/chat-component.tsx:121-123,234-236,263` | backend #4 |
| P1-12 | **Marcadores duplicados** (sin `clearLayers`) + popups HTML crudos con `onclick` inline e interpolación sin escape (XSS latente) + mojibake `�` en "Navegar" | `components/interactive-map.tsx:354-647,464-590,551` | frontend #10/#11 |
| P1-13 | **Escala dual chilena sin declarar**: labels inventados NORMAL/PRECAUCIÓN/ALERTA/EMERGENCIA mezclan vocabulario SENAPRED (tricolor) con SERNAGEOMIN (4 niveles); "ALERTA" colisiona con "Alerta Amarilla" de SENAPRED | `volcano-status-header.tsx:17-60`, `admin-panel.tsx:33-62` | designer P1-E/F, PM §4.1 |
| P1-14 | **4 sistemas de color de nivel divergentes** (header, banner vía DB, admin, mapa): un "rojo" se ve distinto según la pantalla | `volcano-status-header.tsx:17-60`, `admin-panel.tsx:33-62`, `interactive-map.tsx:426-436` | designer P1-D |
| P1-15 | **Datos de emergencia fabricados en el bundle de producción**: `emergencyData` hardcodeado (incl. "ERUPCIÓN INMINENTE"), `forceEmergency`, parámetros `Math.random()`, atribución falsa "SERNAGEOMIN - OVDAS" sobre datos locales | `volcano-status-banner.tsx:165-239,715`, `emergency-modal.tsx:125-145`, `admin-panel.tsx:328-361` | designer P1-G, backend #11 |
| P1-16 | **Modales críticas sin semántica**: `<div>`s `fixed inset-0` sin `role="alertdialog"`/`aria-modal`/focus trap; cero `aria-*` en toda la app (grep verificado) — el evento más importante del producto es invisible para lectores de pantalla | `emergency-modal.tsx:260-356`, `volcano-status-banner.tsx:991-1072` | designer P0-B, frontend #5 |
| P1-17 | **N+1 del chat**: 1 query por usuario para el último mensaje + refetch completo ante cada INSERT global + suscripción recreada al marcar leído | `chat-component.tsx:100-187,334,376` | performance #5, frontend #15, backend #22 |
| P1-18 | **Imágenes base64 multi-MB en la DB** (sin límite ni recompresión; parseo `[img]` naive) | `lib/message-media.ts:11-36`, `chat-component.tsx:430`, `community-panel.tsx:203` | frontend #16, backend #8/#9, performance #8 |
| P1-19 | **Deploy frágil**: `deploy.js` corre `npm run build` en proyecto pnpm + `vercel --prod` directo desde local (sin preview ni rollback) | `scripts/deploy.js:15,50-58` | defects #4, operations #4/#5 |
| P1-20 | **PII en consola de producción**: ~25 `console.*` con emojis y teléfonos/nombres en `auth-context`; los demás usan `lib/logger` | `contexts/auth-context.tsx` (25 sitios) | frontend #17, defects #2 |
| P1-21 | **7 queries secuenciales por banner** (y se re-ejecuta completa por evento realtime) | `volcano-status-banner.tsx:302-413,591-607` | frontend #13, performance #4 |
| P1-22 | **Suite de tests no corre**: sin `node_modules` ni lockfile en el repo; además los tests de auth re-implementan helpers inline (testean un fork, no el código) y `auth-context.test.tsx` nunca renderiza el provider | `__tests__/auth-utils.test.ts:10-40`, `__tests__/auth-context.test.tsx` | defects #14/#15/#16 |

## P2 — Confianza, escala, accesibilidad, consistencia

| # | Hallazgo | Evidencia | Fuente |
|---|---|---|---|
| P2-1 | **A11y ausente**: lista de conversaciones `div` clickeable sin role/tabIndex, botones solo-icono sin `aria-label`, <44px touch targets, `text-gray-500` sobre gray-900 (~3.7:1, falla 4.5:1), Ctrl+Shift+A interrumpe la escritura | `chat-component.tsx:525-593,723-737`, `community-panel.tsx:346-361`, `use-admin-panel.ts:16` | frontend #5/#21, designer P2 |
| P2-2 | **Sin `prefers-reduced-motion`**: `animate-pulse`/`bounce`/scroll suave + sirena sin guarda — la pantalla más crítica pulsa perpetuamente | `app/globals.css:6-27,119-141`, `emergency-modal.tsx:261` | frontend #6, designer P2-B |
| P2-3 | **Tema dark-only imposible de cambiar**: tokens HSL solo en `:root`, `darkMode:["class"]` sin `.dark`, colores hardcodeados (`bg-gray-900`, `#1f2937 !important` en Leaflet) | `app/globals.css:7-27`, `interactive-map.tsx:41`, `tailwind.config.ts:5` | frontend #7, designer P2-D |
| P2-4 | **Brand inconsistente**: "VULCANIA - Demo" vs "VOLCANO EMERGENCIA" en la misma app; 3 acentos (rojo/azul/verde) en tabs diluyen el lenguaje de alerta | `app/layout.tsx:8`, `app/page.tsx:88-106` | designer P2-C |
| P2-5 | **`alert()`/`confirm()` nativos** con la infraestructura de toasts muerta (`use-toast`, `toaster.tsx`, `@radix-ui/react-toast` sin uso) | `admin-panel.tsx:153,159,319,322`, `community-panel.tsx:175` | frontend #22/#23, defects #6 |
| P2-6 | **Estado de emergencia tras el login**: el visitante sin sesión no ve el nivel de alerta vigente | `app/page.tsx:43-45` | PM P2-6 |
| P2-7 | **Heurística de palabras clave** peligro/seguro/evacuación malclasifica ("no está bien" → safe) | `community-panel.tsx:266-283` | designer P2 |
| P2-8 | **Sin leyenda ni empty state en el mapa**; marcadores solo-color (WCAG 1.4.1) sin focus | `interactive-map.tsx:324,426-436,708-809` | designer P2 |
| P2-9 | **Identidad demo triplicada con formato inconsistente**: seed DB `'+56900000000'` vs `APP_CONFIG.demoPhone '+56 9 8765 4321'` — el login demo no funciona en instalaciones reales | `scripts/init.sql:392-393`, `lib/app-config.ts:21`, `lib/demo-data.ts:8` | backend #18 |
| P2-10 | **Detección de demo mode duplicada 5x con semánticas divergentes** (auto-demo vs explícito) | `lib/supabase.ts:8`, `lib/app-config.ts:12`, `validate-env.ts:56-62`, `doctor.ts:18-20`, `deploy.js:10` | defects #5 |
| P2-11 | **Timestamps demo congelados al cargar módulo** → "hace X" negativos | `lib/demo-data.ts:3` | performance #12 |
| P2-12 | **Mediciones VARCHAR con unidades embebidas + `random()`**: datos no comparables en SQL; simulación indistinguible de datos reales; sin columna `fuente`/`es_simulacion` | `scripts/init.sql:33-35,151-216` | backend #11/#14 |
| P2-13 | **Alertas sin auditoría**: `logs_sistema` solo cubre puntos de encuentro; el cambio de nivel —la operación de mayor riesgo— no deja rastro de quién/cuándo | `scripts/init.sql:123-131,273-297` | backend #19 |
| P2-14 | **FK de `alertas_volcan` sin índices**; nivel como varchar sin `ON UPDATE CASCADE` | `scripts/init.sql:59-60,66,74,82,137` | backend #12/#13 |
| P2-15 | **Estado de leído solo en cliente** (schema tiene columnas, la app nunca las escribe); badge hardcodeado a 1 | `chat-component.tsx:132-149`, `scripts/init.sql:118-119` | frontend #29, backend #16 |
| P2-16 | **`RutaEvacuacion` interfaz fantasma** (no existe tabla); `zonas_exclusion` en schema, nunca renderizada | `lib/supabase.ts:130-138`, `scripts/init.sql` | backend #17, PM §4.5 |
| P2-17 | **Init de Leaflet con `setTimeout` mágicos** (50/200/500ms) + recreación del mapa por cambio de vista + remount por `key` con flash negro de 1-2s ante cambios de admin | `interactive-map.tsx:265-278,659-695`, `app/page.tsx:80,111` | frontend #8/#9, performance #6 |
| P2-18 | **`doctor` valida 6 de 12 tablas** — reporta saludable con el chat roto | `scripts/doctor.ts:9-17` | defects #17 |
| P2-19 | **Script `test-realtime` roto** apunta a archivo inexistente | `package.json:17` | defects #3, operations #6 |
| P2-20 | **`.env.example` ausente** (README lo referencia) y `.env.*` no ignorado salvo `.env`/`.env.local` — riesgo de secretos commiteados | `.gitignore:21-22`, `README.md:73` | operations #7/#8 |
| P2-21 | **Guerra de z-index `!important`** (9998/9999) + glob Tailwind catch-all raíz | `app/globals.css:56-83`, `tailwind.config.ts:10` | frontend #27/#28 |

## P3 — Higiene y pulido

| # | Hallazgo | Fuente |
|---|---|---|
| P3-1 | Restos de dev en UI: botón "Reset" del chat, debug "Actual: {teléfono} (N chars)", "Enviando SMS..." falso, `setError("")` duplicado | frontend #26, designer P2-I |
| P3-2 | `metadata.generator: "v0.dev"` + package name `my-v0-project` — huella del generador | frontend #24, defects #12 |
| P3-3 | `next lint` deprecado (Next 16 lo elimina) + `.eslintrc.json` legacy muerto | defects #9/#10, operations #9 |
| P3-4 | `catch {}` vacíos en audio-unlock y browser-notifications | defects #11 |
| P3-5 | Validación de teléfono acepta `+56912345` (longitud no canónica) | defects #13 |
| P3-6 | `console.clear()` en validate-env; seed sin guarda de idempotencia | defects #18, operations |
| P3-7 | Flag `loading` de auth muerto (flash de deslogueado en SSR) | defects #19 |
| P3-8 | Emojis como iconos (🚨📍🔊💡🚀🔄) en todas las superficies | designer P2 |
| P3-9 | `animate-bounce`/`pulse` redefinidos a mano en globals; spinner de carga en rojo (color de alerta) | designer P3 |
| P3-10 | `onKeyPress` también dispara con IME en composición (es-CL) | designer P3 |
| P3-11 | Solo `:focus-visible` ring rojo global; controles Leaflet sin focus | designer P3 |
| P3-12 | Login reescribe el prefijo con onFocus/onBlur (jerky en móvil) | designer P3 |
| P3-13 | Código duplicado: `createAlertSound`, `calcularTiempoTranscurrido`, `formatearFecha` en 3+ archivos | frontend #19 |
| P3-14 | Vitest sin thresholds de cobertura; reviewer workflow sin `paths:` filter; sin `engines` | operations #10/#13 |

## Correcciones a claims previos (verificadas con evidencia)

- **`any` NO confirmado**: `rg` no encuentra `: any`/`as any` en `app/`/`components/`/`contexts/`/`hooks/`; solo casts tipados. Descartado (frontend #30).
- **`volcano-status-banner.tsx` (1075 L) es código muerto**, no coste de re-render; el banner vivo es `volcano-status-header.tsx`. Los fixes de banner deben aterrizar en el header (performance).
- **Doble modal de emergencia es latente**: se materializa solo si se revive el banner muerto (PM §2, consenso).

## Quick wins (S ≤ 1 día, hoy)

1. Seed de alerta en verde/amarillo (P0-4) — un deploy nuevo no puede simular una emergencia real.
2. Fix Enter-para-enviar (`onKeyDown`, P1-1) — el envío principal del chat.
3. Corregir números de emergencia: 131 SAMU / 132 Bomberos / 133 Carabineros, en una sola fuente (P0-5).
4. Borrar restos de debug de la UI: Reset del chat, "Enviando SMS...", `emergencyData` (P3-1).
5. Publication de realtime en `init.sql` (P1-4) — sin esto "tiempo real" es mentira.
6. Restaurar gates: quitar `ignoreBuildErrors`/`ignoreDuringBuilds`, fix `test-realtime` (P1-5, P2-19).
7. Validación de teléfono canónica (12 dígitos, P3-5) + error de login con motivo tipado.
8. Badge de no-leídos con conteo real (P2-15).
9. Eliminar el banner muerto de 1075 líneas (P1-9) — elimina modal duplicada latente y 7-query chains.
10. Corregir mojibake `�` en "Navegar" (P1-12).
11. Unificar identidad demo (P2-9).
12. `doctor` valida 12 tablas + publication (P2-18, P1-4).

## Preguntas abiertas que bloquean decisiones (ver informes para detalle)

1. **¿Prototipo demo o producto en producción?** Determina si P0 son bloqueantes de release o deuda de prototipo.
2. **¿Escala canónica: SERNAGEOMIN 4 niveles?** (recomendado: sí — coincide con el código; SENAPRED solo como capa de guía).
3. **¿Quién opera el dashboard de Supabase?** Urgente: hoy la DB está abierta a la anon key.
4. **¿Login con OTP real (Supabase) o entrada sin verificar como decisión consciente?** Todo el diseño RLS cuelga de aquí.
5. **¿Números de emergencia verificados contra fuente oficial** (SENAPRED) antes de ship?
6. **¿Estado de emergencia visible sin login?** (recomendado: sí — seguridad pública).
7. **¿Se ingerirán datos reales de Sernageomin?** Determina esquema numérico + provenance.
8. **¿Revivir o eliminar el banner muerto?** (recomendado: eliminar).
9. **¿Sonido automático en naranja/rojo o permiso explícito?**

---

*Documento consolidado por el orquestador a partir de los 8 reportes de auditoría. Los informes W1/W2 en este directorio contienen el detalle completo, los planes de división de componentes y las recomendaciones por dominio.*
