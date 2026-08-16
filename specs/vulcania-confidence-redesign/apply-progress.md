# Apply Progress — vulcania-confidence-redesign

## Meta

- **Feature:** vulcania-confidence-redesign
- **Linked tasks:** `specs/vulcania-confidence-redesign/tasks.md`
- **Batches completed:** 5

## Batch Log

### Batch 1 — 2026-08-16

**Tasks:** T001, T002

**Files modified:**

- `specs/vulcania-confidence-redesign/` — propuesta, requisitos, diseño y tareas.

**Notes:** Se adoptó una implementación demo-first, con Supabase Auth OTP y
RLS/RPC como frontera de seguridad en modo completo. No se ejecutan deploys ni
se modifican servicios remotos.

### Batch 2 — 2026-08-16

**Tasks:** T003–T007

**Files modified:**

- `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `next.config.mjs` y `tsconfig.json` — stack reproducible, gates y configuración segura.
- `lib/`, `contexts/`, `scripts/init.sql` — contratos, auth, modo demo, RLS/RPC, auditoría y Realtime.

**Notes:** Se separó estrictamente demo offline de Supabase OTP. La demo usa
`sessionStorage`; el modo completo no fabrica sesiones ni usa `localStorage`.

### Batch 3 — 2026-08-16

**Tasks:** T008–T020

**Files modified:**

- `app/`, `components/`, `contexts/` y `app/globals.css` — shell responsive, fuente única de alertas, modal crítica, mapa, comunidad, chat y consola de operador.
- Se retiró código muerto y se endurecieron adjuntos, audio, roles, nombres de autor y grants por columna.

**Notes:** El estado crítico tiene un solo `AlertProvider`, una sola modal y un
singleton de audio. El mapa es referencial y no inventa el nivel de alerta.

### Batch 4 — 2026-08-16

**Tasks:** T021–T024

**Files modified:**

- `README.md`, `TESTING.md`, `SUPPORT.md`, `DESIGN.md`, `audit/` y `specs/` — documentación honesta y trazabilidad de verificación.
- `__tests__/` — regresiones de auth demo, teléfono, configuración, login y media.

**Evidence histórica del batch:** lint, typecheck, 8 archivos/35 tests, build Next 16.3.1,
`pnpm audit --audit-level high`, doctor/realtime/validate-env demo, smoke HTTP
200 y revisión SQL estática.

### Batch 5 — 2026-08-16

**Tasks:** hardening posterior a la primera verificación.

**Files modified:**

- `.github/workflows/ci.yml`, `.github/actionlint.yaml`, `vitest.config.ts`, `__tests__/` — coverage con
  baseline y 15 archivos/51 tests como gate.
- `contexts/alert-context.tsx`, `components/theme-toggle.tsx`,
  `components/emergency-modal.tsx`, `contexts/auth-context.tsx` — hydration y
  storage bloqueado sin romper el flujo local.
- `components/interactive-map.tsx`, `lib/alert-levels.ts`, `lib/demo-data.ts`,
  `app/globals.css` — zonas referenciales, validación/escape de datos y
  controles accesibles.
- `scripts/init.sql`, `scripts/doctor.ts`, `scripts/deploy.ts`, `hooks/use-admin-panel.ts` — RPC
  públicos revocados, tablas protegidas diagnosticables y atajo no invasivo.
- `scripts/deploy.ts` — el deploy local bloquea antes de Vercel si falla y la producción es opt-in
  después de todos los gates de calidad.

**Evidence:** lint, typecheck, test:run (15 archivos/51 tests), test:coverage,
actionlint y build frescos; el
build genera chunks separados para Leaflet, comunidad, chat y operador.

## Current State

### Completed

- [x] T001 — Exploración y auditoría leídas.
- [x] T002 — SDD inicial creado.
- [x] T003–T024 — Implementación, documentación y verificación local completadas.

### Pending

- Ninguna tarea local pendiente.

## Implementation Notes

- La alerta demo inicial debe ser verde y debe mostrar `es_simulacion`.
- Los números de emergencia viven únicamente en `lib/emergency-contacts.ts`.
- No se ejecutó despliegue ni E2E autenticado contra un Supabase real; esos son
  gates externos pendientes de credenciales/entorno.
- `scripts/init.sql` tuvo revisión estática; no había un cliente `psql` o parser
  SQL local disponible para ejecutar la migración contra una base real.
