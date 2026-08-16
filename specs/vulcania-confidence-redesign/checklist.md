# Checklist — vulcania-confidence-redesign

## Explore → Propose

- [x] CHK001 Problema definido.
- [x] CHK002 Scope in/out documentado.
- [x] CHK003 Alternativas consideradas.
- [x] CHK004 Constitution check inicial.
- [x] CHK005 Áreas afectadas mapeadas.

## Requirements

- [x] CHK006 User stories priorizadas.
- [x] CHK007 User stories testeables.
- [x] CHK008 Escenarios Given/When/Then.
- [x] CHK009 Requisitos FR trazables.
- [x] CHK010 Edge cases.
- [x] CHK011 Success criteria.
- [x] CHK012 Assumptions.
- [x] CHK013 Clarificaciones resueltas como supuestos explícitos.

## Design / Apply / Verify

- [x] CHK014 Technical context.
- [x] CHK015 Constitution check.
- [x] CHK016 Data model.
- [x] CHK017 File structure.
- [x] CHK018 Dependencies.
- [x] CHK019 Risks.
- [x] CHK020 Complexity tracking no requerido.
- [x] CHK021–CHK030 Implementation and tests.
- [x] CHK031–CHK038 Fresh verification gates.
- [x] CHK039–CHK041 Cierre y lecciones.

## Verification Evidence

- `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (15 files, 51 tests),
  `pnpm test:coverage` and `pnpm build` pass.
- `pnpm audit --audit-level high` reports no known vulnerabilities.
- Demo diagnosis passes with `pnpm run doctor`, `pnpm test-realtime` and `pnpm run validate-env`.
- Dev smoke returns HTTP 200; no agent files are generated because `agentRules: false` is explicit.
- SQL static review confirms 12 tables with RLS, 16 policies and 4 Realtime publication entries.
- Coverage baseline passes: 30% statements/lines, 60% branches, 70% functions.
- Production build contains separate chunks for Leaflet and the map/community/chat/operator panels.
- External gates remain explicit: authenticated Supabase OTP/RLS/Realtime E2E, production deploy and physical/public smoke are not claimed.
