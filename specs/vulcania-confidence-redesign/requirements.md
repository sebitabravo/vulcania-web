# Requirements — Vulcania: piso de confianza y rediseño

## Meta

- **Feature:** vulcania-confidence-redesign
- **Author:** Codex
- **Status:** implemented locally; external Supabase/production gates pending
- **Date:** 2026-08-16
- **Constitution:** [x] Verified against repository instructions

## Context

La auditoría encontró login forjable, RLS incompleta, cambios de alerta no
atómicos, sirena duplicada, números críticos incorrectos y una interfaz
dark-only con flujos demo rotos. La implementación debe corregir el riesgo y
hacer que el camino demo sea reproducible y demostrable sin backend.

## User Stories

### User Story 1 — Consultar una alerta confiable (Priority: P1) 🎯 MVP

**Narrative:** Como vecino, quiero entender el nivel vigente, su antigüedad,
fuente y acción recomendada sin iniciar sesión.

**Why this priority:** Es la función de seguridad pública y debe existir aunque
el resto de la app no esté disponible.

**Independent Test:** Renderizar la pantalla sin sesión y comprobar nivel,
fuente, timestamp, texto alternativo del mapa y modal solo para nivel crítico.

**Acceptance Scenarios:**

1. **Given** una alerta verde demo, **When** se abre Vulcania, **Then** aparece
   `Alerta Verde`, `Simulación demo`, la hora de actualización y no se muestra
   una emergencia falsa.
2. **Given** una alerta naranja o roja nueva, **When** llega el evento realtime,
   **Then** se abre una sola modal con `role=alertdialog`, foco gestionado,
   mute y contactos 131/132/133.

### User Story 2 — Entrar y participar sin suplantación (Priority: P1) 🎯 MVP

**Narrative:** Como usuario, quiero entrar al demo sin fricción o verificar mi
teléfono con OTP real en producción para publicar y conversar con una identidad
no forjable.

**Why this priority:** La comunidad y RLS dependen de una identidad confiable.

**Independent Test:** El modo demo entra con un número válido; el modo completo
solicita OTP y no guarda una sesión fabricada en `localStorage`.

**Acceptance Scenarios:**

1. **Given** modo demo, **When** pulso entrar al demo, **Then** se crea una
   sesión local rotulada y se habilitan acciones demo en memoria.
2. **Given** modo completo, **When** envío un teléfono válido, **Then** se
   llama `supabase.auth.signInWithOtp` y se solicita un código antes de entrar.
3. **Given** un teléfono inválido o error de red, **When** envío el formulario,
   **Then** veo un error accionable sin datos sensibles en consola.

### User Story 3 — Usar mapa, comunidad y chat (Priority: P1) 🎯 MVP

**Narrative:** Como vecino, quiero encontrar un punto, leer reportes y enviar
un mensaje con teclado o móvil.

**Why this priority:** Es la capa comunitaria diferencial del producto.

**Independent Test:** En demo se pueden seleccionar puntos, abrir navegación,
crear un aviso y enviar un mensaje sin Supabase.

**Acceptance Scenarios:**

1. **Given** puntos cargados, **When** selecciono un punto en el mapa o lista,
   **Then** se muestra su estado, capacidad y enlace seguro de navegación.
2. **Given** el composer enfocado, **When** pulso Enter sin composición IME,
   **Then** se envía una vez; Shift+Enter conserva el salto de línea.
3. **Given** una imagen mayor al límite, **When** intento adjuntarla, **Then**
   se rechaza con explicación y no se guarda base64 ilimitado.

### User Story 4 — Operar una alerta con control (Priority: P1)

**Narrative:** Como operador autorizado, quiero cambiar el nivel y el estado
de puntos con doble confirmación y auditoría.

**Why this priority:** Impide que un atajo de teclado otorgue capacidad de
publicar una alerta falsa.

**Independent Test:** Un usuario no operador no puede abrir ni ejecutar el panel;
un operador usa RPC y el cambio queda registrado.

**Acceptance Scenarios:**

1. **Given** usuario no operador, **When** pulsa Ctrl+Shift+A o visita el shell,
   **Then** el panel no se abre y las políticas rechazan mutaciones.
2. **Given** operador autenticado, **When** solicita nivel rojo, **Then** ve
   una segunda confirmación con blast radius antes de llamar al RPC.

## Functional Requirements

### FR-001 — Nivel semántico único

**Type:** Ubiquitous

**Description:** El sistema MUST usar verde, amarillo, naranja y rojo como
claves semánticas SERNAGEOMIN y derivar etiqueta, ícono, patrón y color desde
una sola fuente.

**Acceptance Criteria:** [x] No hay labels NORMAL/PRECAUCIÓN/EMERGENCIA divergentes.

### FR-002 — Estado público verificable

**Type:** Event-Driven

**Description:** El sistema MUST mostrar estado, freshness, fuente y modo demo
sin exigir sesión.

**Acceptance Criteria:** [x] El estado verde demo no abre modal crítica.

### FR-003 — Auth real en full mode

**Type:** Event-Driven

**Description:** El sistema MUST usar Supabase Auth OTP en modo completo y
prohibir el lookup masivo de usuarios como login.

**Acceptance Criteria:** [x] Login full invoca OTP; [x] la sesión full no depende
de `vulcania_usuario`.

### FR-004 — Autorización server-side

**Type:** Unwanted

**Description:** El sistema MUST rejectar lecturas/escrituras sensibles según
RLS y rol; solo operadores pueden cambiar alertas o puntos.

**Acceptance Criteria:** [x] Todas las tablas tienen RLS; [x] mutaciones de
alerta usan RPC atómico; [x] hay auditoría.

### FR-005 — Emergencia única y accesible

**Type:** Event-Driven

**Description:** El sistema MUST tener una sola modal global crítica con
`role=alertdialog`, foco, botón de silencio y contactos oficiales.

**Acceptance Criteria:** [x] No existe polling permanente duplicado; [x] 131
SAMU/ambulancia, 132 Bomberos y 133 Carabineros aparecen desde una fuente única.

### FR-006 — Demo funcional y honesta

**Type:** Ubiquitous

**Description:** El sistema MUST funcionar sin Supabase para login demo, mapa,
comunidad y chat; cada dato simulado MUST estar rotulado.

**Acceptance Criteria:** [x] Demo no muestra "Enviando SMS" falso; [x] seed
verde; [x] community/chat aceptan acciones en memoria cuando no son readonly.

### FR-007 — Accesibilidad y diseño responsive

**Type:** Ubiquitous

**Description:** La UI MUST cumplir las prácticas WCAG 2.2 AA definidas en
`DESIGN.md`, incluyendo light/dark, focus visible, reduced motion y alternativa
textual al mapa.

**Acceptance Criteria:** [x] Controles principales tienen nombres; [x] Enter
funciona con guard IME; [x] mobile no desborda.

### FR-008 — Quality gates reproducibles

**Type:** Ubiquitous

**Description:** El repositorio MUST fijar dependencias y ejecutar lint,
typecheck, tests y build sin ignorar errores.

**Acceptance Criteria:** [x] `pnpm-lock.yaml` versionado; [x] `pnpm lint`,
`pnpm typecheck`, `pnpm test:run`, `pnpm build` pasan.

## Key Entities

- **Usuario:** perfil ligado a `auth.users`; contiene nombre y rol, no es una
  sesión local confiable.
- **AlertaVolcan:** nivel técnico, descripción, timestamps, fuente y flag de
  simulación.
- **PuntoEncuentro:** ubicación, capacidad y estado de ocupación.
- **AvisoComunidad/MensajeChat:** contenido comunitario ligado al usuario
  autenticado y con políticas de acceso por autor/participantes.
- **LogSistema:** auditoría de mutaciones de operación.

## Non-Functional Requirements

### Performance

- No polling de 5 s para alertas; una consulta inicial + Realtime.
- El mapa se inicializa una vez y actualiza una layer group.

### Security

- RLS en toda tabla pública, RPCs con verificación de rol, inputs validados,
  sin HTML interpolado ni PII en logs.

### Accessibility

- WCAG 2.2 AA: semántica, foco, contraste, touch targets de 44 px, reduced
  motion y alternativa textual del mapa.

## Edge Cases

| Case | Expected Behavior |
|---|---|
| Supabase no configurado | Demo offline explícito; nunca claims de SMS/realtime. |
| Red caída | Mantener último estado con banner de stale y no inventar datos. |
| Alerta cambia mientras modal está cerrada | Reabrir solo si cambió `id+timestamp+nivel`. |
| Código OTP incorrecto | Mantener etapa OTP y explicar reintento. |
| Imagen > 2 MB / tipo no imagen | Rechazar antes de leer y mostrar motivo. |
| `Enter` durante composición IME | No enviar. |
| Usuario no operador intenta RPC | RLS/RPC rechaza con error, sin confiar en UI. |

## Success Criteria

- **SC-001:** En demo, una persona puede entrar, entender el estado y publicar
  un aviso y un mensaje sin backend ni errores de consola introducidos por la
  app.
- **SC-002:** En full mode, ninguna mutación de alerta/punto depende solo del
  cliente; la base tiene RLS y funciones atómicas.
- **SC-003:** Un cambio crítico produce como máximo una modal y un controlador
  de audio activo.
- **SC-004:** Los gates `pnpm lint`, `pnpm typecheck`, `pnpm test:run` y
  `pnpm build` terminan con código 0.

## Assumptions

- Supabase Auth phone provider se habilita fuera del repositorio para full mode.
- El demo es una simulación de portfolio, no una fuente oficial ni un canal de
  despacho.
- La escala SERNAGEOMIN es la canónica; SENAPRED se muestra como guía operativa.
- No se ejecutan deploys ni cambios remotos durante esta tarea.

## Out of Scope

- Ingesta automática de RNVV/OVDAS y validación de datos científicos reales.
- E2E autenticado contra un proyecto Supabase real sin credenciales entregadas.

## References

- `audit/findings-consolidated.md`
- `DESIGN.md`
