# Apply Progress — comparative-regression-closure

## Meta
- **Feature:** comparative-regression-closure
- **Linked tasks:** `specs/comparative-regression-closure/tasks.md`
- **Batches completed:** 4

## Batch Log
### Batch 1 — 2026-08-16
**Tasks:** T001, T002
**Files modified:** `specs/comparative-regression-closure/*.md` — SDD proposal, requirements, design, tasks, constitution and checklist.
**Notes:** Explored source/tests before editing. Chosen architecture: 30 s safety refresh plus publication health RPC; no remote Supabase operation.

### Batch 2 — 2026-08-16
**Tasks:** T003-T006 (R1)
**Files modified:** `contexts/alert-context.tsx`, `components/volcano-status-header.tsx`, `scripts/init.sql`, `scripts/doctor.ts`, `__tests__/alert-context.test.tsx`, `__tests__/schema-contract.test.ts`.
**Evidence:** Alert fake-timer tests, SQL/doctor contract, typecheck.

### Batch 3 — 2026-08-16
**Tasks:** T007-T010 (R2)
**Files modified:** `lib/browser-notifications.ts`, `components/notification-toggle.tsx`, chat/community/app and listener tests.
**Evidence:** Permission/visibility/toggle/listener tests; lint.

### Batch 4 — 2026-08-16
**Tasks:** T011-T019 (R3/R4, docs, verification)
**Files modified:** map/login/config, README/TESTING/SUPPORT, four audit reports and this SDD.
**Evidence:** 35 files / 158 tests, coverage 91.34/82.13/91.71, lint, typecheck, build, audit high, doctor demo and Realtime demo skip, actionlint and diff check.

## Current State
### Completed
- [x] T001 — Explore current branch, source, tests and audit reports (batch 1)
- [x] T002 — Define proposal/requirements/design/tasks and constitution (batch 1)
### Task log
- [x] T003-T006 — R1 alert fallback, status, SQL RPC, doctor and tests
- [x] T007-T010 — R2 notification API, toggle, listeners and tests
- [x] T011-T015 — R3/R4 demo gate, copy, Street View, tests and reports
- [x] T016-T019 — docs, security review and full verification

## Implementation Notes
- El último `alerta` válido se conserva cuando falla un refresh.
- El demo bypass solo afecta UI local; la autoridad full mode permanece en Supabase.
- La pérdida de imágenes del informe productivo se corregirá como claim falso; no se elimina el código de adjuntos.
- Las coordenadas inválidas no crean marker ni enlace externo; la regresión está cubierta en `interactive-map.test.tsx`.
- El health check remoto no se ejecutó: falta un proyecto Supabase autorizado; `pnpm run doctor` solo confirmó el camino demo offline.
