# Tasks — comparative-regression-closure

## Meta
- **Feature:** comparative-regression-closure
- **Author:** Codex
- **Status:** ready
- **Total tasks:** 19
- **Linked spec:** `specs/comparative-regression-closure/requirements.md`
- **Linked design:** `specs/comparative-regression-closure/design.md`

## Phase 1: Setup
- [x] T001 Confirmar branch, scope y tests existentes; no se requieren dependencias.
- [x] T002 [P] Crear artefactos SDD y registrar decisiones R1-R4.

## Phase 2: Foundational / User Story 1 — Alertas resistentes (P1)
- [x] T003 [US1] Añadir safety refresh de 30 s, dedupe y estado Realtime en `contexts/alert-context.tsx`.
- [x] T004 [US1] Añadir `verificar_publicaciones_realtime()`/grants a `scripts/init.sql` y gate en `scripts/doctor.ts`.
- [x] T005 [US1] Añadir tests de AlertProvider, status, RPC y doctor.
- [x] T006 [US1] Mostrar warning de canal no suscrito en `components/volcano-status-header.tsx`.
**Checkpoint:** R1 implementada, testeada y documentada; live Supabase sigue fuera de scope.

## Phase 3: User Story 2 — Notificaciones opt-in (P2)
- [x] T007 [US2] Crear `lib/browser-notifications.ts` SSR-safe y `components/notification-toggle.tsx`.
- [x] T008 [US2] Integrar notificaciones de terceros en listeners de chat/comunidad.
- [x] T009 [P] [US2] Añadir tests de permiso, visibilidad, toggle y filtro de propio evento.
- [x] T010 [US2] Integrar toggle en `app/page.tsx` y documentar opt-in.
**Checkpoint:** R2 funciona con permiso, sin permiso y con pestaña visible/oculta.

## Phase 4: User Story 3 — Demo/paridad (P2)
- [x] T011 [US3] Añadir bypass de gestión solo demo y saludo en `app/page.tsx`.
- [x] T012 [P] [US3] Fijar default de panel demo en `lib/app-config.ts`.
- [x] T013 [P] [US3] Añadir URL/link Street View y copy de teléfono en mapa/login.
- [x] T014 [P] [US3] Añadir tests de gate, Street View y copy.
- [x] T015 [US3] Corregir los cuatro informes y descartar explícitamente el falso claim de pérdida de imágenes.
**Checkpoint:** R3/R4 implementadas y cubiertas.

## Phase 5: Polish & Verification
- [x] T016 [P] Actualizar README/TESTING/SUPPORT con init/doctor/notificaciones/demo.
- [x] T017 [P] Revisar seguridad, diff, secrets, debug y generated files.
- [x] T018 Ejecutar tests, lint, typecheck, build, coverage, actionlint y diff-check.
- [x] T019 Registrar evidencia final y límites externos en `apply-progress.md`.

## Final Verification
- [x] `pnpm test:run` exit 0 (35 files / 158 tests).
- [x] Coverage reportada honestamente frente al floor global 80/70/90: 91.34 / 82.13 / 91.71.
- [x] `pnpm lint` y `pnpm typecheck` limpios.
- [x] Cada FR tiene al menos un test o contrato estático asociado.
- [x] No se afirma ejecución de Supabase real ni deploy público.
