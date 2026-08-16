# Requirements — comparative-regression-closure

## Meta
- **Feature:** comparative-regression-closure
- **Author:** Codex
- **Status:** spec_ready
- **Date:** 2026-08-16
- **Constitution:** [x] Verified against project constitution

## Context
La implementación mejoró autenticación, estado, mapa, moderación y accesibilidad,
pero la comparación detectó cuatro pérdidas operativas. Este bloque las cierra sin
inventar integraciones externas ni alterar la frontera de seguridad full mode.

## User Stories
### User Story 1 — Alertas resistentes a fallas de Realtime (Priority: P1) 🎯 MVP
**Narrative:** Como persona que depende del estado del volcán, quiero que una caída silenciosa de Realtime no congele la última alerta sin advertencia.

**Why this priority:** Una alerta crítica desactualizada puede producir una decisión equivocada en producción.

**Independent Test:** Fake timers del `AlertProvider` verifican nuevo fetch, preservación del último dato y estado; el contrato SQL y doctor verifican publication.

**Acceptance Scenarios:**
1. **Given** una alerta cargada y el canal no suscrito, **When** transcurre el intervalo de seguridad, **Then** se reconsulta `alertas_volcan` sin borrar la última alerta y se indica que Realtime no está disponible.
2. **Given** un proyecto sin una publication, **When** se ejecuta `pnpm doctor`, **Then** falla y recomienda volver a ejecutar `scripts/init.sql`.

### User Story 2 — Avisos fuera de la pestaña (Priority: P2)
**Narrative:** Como persona de la comunidad, quiero recibir una señal cuando llega un mensaje o reporte mientras estoy en otra pestaña.

**Why this priority:** Era una capacidad viva del producto anterior, pero pedir permiso automáticamente sería una regresión de privacidad.

**Independent Test:** Tests de la utilidad cubren SSR/permiso/visibilidad y tests de listeners cubren terceros versus usuario propio.

**Acceptance Scenarios:**
1. **Given** permiso `granted` y pestaña oculta, **When** llega un evento de otra persona, **Then** se crea una notificación; en pestaña visible no se crea.

### User Story 3 — Demo y paridad de navegación (Priority: P2)
**Narrative:** Como evaluador del portfolio, quiero demostrar el flujo de emergencia y abrir Street View sin que la demo simule autoridad real.

**Why this priority:** La modal crítica es el flujo insignia; Street View y el microcopy son correcciones baratas.

**Independent Test:** Render demo de `app/page` con rol user, render del mapa para la URL pano y render de login/shell para copy.

**Acceptance Scenarios:**
1. **Given** demo offline y usuario `user`, **When** abre la consola, **Then** ve `Simulación demo` y ninguna acción llama Supabase.
2. **Given** coordenadas válidas, **When** selecciona Street View, **Then** se abre URL externa con `api=1`, `map_action=pano` y `viewpoint`.

## Functional Requirements (EARS)
### FR-001 — Fallback y estado de alertas
**Type:** State-Driven

**Description:** Mientras full mode esté activo, el sistema MUST ejecutar una actualización de seguridad acotada si Realtime no está confirmado como suscrito, evitar requests concurrentes y conservar la última alerta válida ante un fallo posterior.

**Acceptance Criteria:**
- [x] Intervalo documentado de 30 s, no 5 s.
- [x] Error no reemplaza una alerta válida por `null` y expone estado accionable.

### FR-002 — Diagnóstico de publication
**Type:** Event-Driven

**Description:** `pnpm doctor` debe consultar un RPC de salud con booleanos para `alertas_volcan`, `puntos_encuentro`, `avisos_comunidad` y `mensajes_chat`, y fallar si falta cualquiera.

**Acceptance Criteria:**
- [x] `init.sql` crea el RPC idempotentemente y no expone filas ni secretos.
- [x] El fallo recomienda reejecutar `scripts/init.sql`.

### FR-003 — Notificaciones explícitas
**Type:** Event-Driven

**Description:** El sistema MUST ofrecer un control visible para solicitar permiso y MUST notificar eventos entrantes solo con permiso concedido, pestaña oculta y autor distinto.

**Acceptance Criteria:**
- [x] SSR, API ausente, permiso no concedido y pestaña visible fallan cerrado.
- [x] Solo la acción del usuario llama `requestPermission`.

### FR-004 — Demo administrativa honesta
**Type:** State-Driven

**Description:** Con demo y panel habilitados, un usuario demo `user` puede abrir la consola local; full mode exige `operator`/`admin`.

**Acceptance Criteria:**
- [x] La demo muestra `Simulación demo` y no llama RPC.
- [x] Full mode conserva el gate por rol.

### FR-005 — Paridad de navegación y copy
**Type:** Ubiquitous

**Description:** Cada punto con coordenadas válidas ofrece navegación y Street View; login explica el formato móvil chileno y shell saluda al usuario autenticado.

**Acceptance Criteria:**
- [x] Street View usa `api=1&map_action=pano&viewpoint=...`.
- [x] El copy no afirma autoformateo que el código no realiza.

## Key Entities
- **AlertaVolcan:** última alerta, nivel, fuente, referencia y timestamp; se conserva como stale si falla refresh.
- **RealtimePublicationHealth:** cuatro booleanos de readiness, sin datos de usuario ni contenido de tablas.
- **Browser notification:** señal efímera de evento entrante; no se persiste.

## Non-Functional Requirements
### Performance
- Fallback como máximo cada 30 s y sin requests solapados.
### Security
- Full mode conserva RLS/RPC; health RPC expone solo booleanos; no se imprimen claves.
### Accessibility
- Toggle con nombre/estado y target táctil; enlaces externos con `noreferrer`.

## Edge Cases
| Case | Expected Behavior |
|---|---|
| Sin permiso de notificaciones | Explica cómo habilitarlo; no crea Notification. |
| Navegador sin Notification | Toggle no opera y el producto sigue usable. |
| Error de alerta | Conserva último dato, marca error/stale y continúa fallback. |
| Refresh concurrente | Queda una sola consulta en vuelo. |
| Publication faltante | Doctor falla con instrucción de rerun de `init.sql`. |
| Coordenada inválida | No crea marker ni enlace externo riesgoso. |

## Success Criteria
- **SC-001:** Una alerta nueva se recoge dentro de 30 s cuando Realtime no está suscrito.
- **SC-002:** Doctor identifica cuatro publications y falla accionablemente ante cualquier ausencia.
- **SC-003:** Tests cubren permiso/visibilidad, demo/full role gate y Street View; gates locales aplicables terminan en exit 0.

## Assumptions
- El navegador puede negar notificaciones y el producto sigue usable.
- El operador real se valida solo en Supabase; demo es portfolio.
- Un proyecto existente puede requerir reejecutar `scripts/init.sql`; este bloque no toca remoto.

## Out of Scope
- E2E autenticado contra Supabase real, Storage, PWA/push, Sentry y deploy público.
- Restauración de pérdidas intencionales no relacionadas con estas regresiones.

## References
- `audit/comparative-regressions.md`
- <https://developers.google.com/maps/documentation/urls/get-started>
