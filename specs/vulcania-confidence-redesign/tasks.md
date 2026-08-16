# Tasks — vulcania-confidence-redesign

## Meta

- **Feature:** vulcania-confidence-redesign
- **Author:** Codex
- **Status:** completed
- **Total tasks:** 24
- **Linked spec:** `specs/vulcania-confidence-redesign/requirements.md`
- **Linked design:** `specs/vulcania-confidence-redesign/design.md`

## Phase 1: Setup

- [x] T001 Read audit, project instructions, source and existing tests.
- [x] T002 Create proposal, requirements and design artifacts.
- [x] T003 Install/fix reproducible dependency manifest and lockfile.

## Phase 2: Foundational

- [x] T004 [P] Add semantic alert-level, date, contact and audio modules.
- [x] T005 [P] Replace auth lookup/localStorage with demo session vs Supabase OTP.
- [x] T006 [P] Rewrite SQL schema, RLS, role checks, RPCs, audit and realtime.
- [x] T007 [P] Restore lint/typecheck/build gates and diagnosis scripts.

**Checkpoint:** domain contracts, auth boundary and database security are in place.

## Phase 3: User Story 1 — alerta pública y emergencia

- [x] T008 [US1] Redesign public status header using the semantic level map.
- [x] T009 [US1] Replace emergency modal with one accessible alertdialog and singleton sound.
- [x] T010 [US1] Add public/demo status and source/freshness labels to shell/login.

## Phase 4: User Story 2 — acceso y participación

- [x] T011 [US2] Redesign login for demo entry and full OTP verification.
- [x] T012 [US2] Add demo-capable community composer with image cap and inline errors.
- [x] T013 [US2] Rewrite chat with safe Enter handling, real unread state and demo memory.

## Phase 5: User Story 3 — mapa y experiencia

- [x] T014 [US3] Rewrite Leaflet integration with one map/layer group and no HTML injection.
- [x] T015 [US3] Add textual map alternative, legend, empty state and navigation links.
- [x] T016 [US3] Rebuild app shell, theme toggle, tabs and responsive status/metrics layout.
- [x] T017 [US3] Apply typography, light/dark tokens and reduced-motion styles.

## Phase 6: User Story 4 — operación

- [x] T018 [US4] Gate admin shortcut/UI by role and remove client-side random mutations.
- [x] T019 [US4] Use operator RPC and two-step confirmation for alert changes.
- [x] T020 [US4] Use RPCs for point state/reset and surface non-blocking operation errors.

## Phase 7: Polish & verification

- [x] T021 [P] Update README, testing/support docs and verify the existing env example for the actual modes.
- [x] T022 [P] Add regression tests for phone, alert levels, auth demo/full, login, emergency, community/chat and media limits.
- [x] T023 Run lint, typecheck, test, build, SQL/static security checks and review diff.
- [x] T024 Record apply progress, learnings and final requirement evidence.

## Final Verification

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test:run` (15 files, 51 tests)
- [x] `pnpm test:coverage` (baseline thresholds pass)
- [x] `pnpm build`
- [x] `pnpm audit --audit-level high`
- [x] `pnpm run doctor`, `pnpm test-realtime`, `pnpm run validate-env` in demo mode.
- [x] Demo dev smoke: `GET /` returned HTTP 200 with Next.js 16.3.1.
- [x] SQL static review: 12 tables/RLS, 16 policies, 4 Realtime tables, no `random()`.
- [x] `git diff --check`
- [x] No `onKeyPress`, `alert(`, `confirm(`, inline `onclick`, `Math.random()` in app operations, or production PII logs.

## Post-implementation hardening

- [x] Eliminar warnings de lint por artefactos `coverage/` y excluir `.next/` del análisis.
- [x] Añadir CI reproducible con Node 22/pnpm 10.10.0 y cobertura como gate.
- [x] Evitar hydration mismatch en alerta demo/tema y tolerar storage bloqueado.
- [x] Mostrar zonas de exclusión referenciales con capa Leaflet y alternativa textual.
- [x] Endurecer tooltips Leaflet, validación de coordenadas, focus y targets de 44 px.
