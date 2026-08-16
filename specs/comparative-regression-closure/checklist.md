# Checklist — comparative-regression-closure

## Phase 1: Explore → Propose
- [x] CHK001 Problem defined.
- [x] CHK002 Scope In/Out documented.
- [x] CHK003 Alternatives rejected with reasons.
- [x] CHK004 Constitution check passed.
- [x] CHK005 Affected areas mapped.

## Phase 2: Requirements
- [x] CHK006 Priorities and rationale.
- [x] CHK007 Independent tests.
- [x] CHK008 Given/When/Then scenarios.
- [x] CHK009 FR traceability.
- [x] CHK010 Edge cases.
- [x] CHK011 Measurable success criteria.
- [x] CHK012 Assumptions explicit.
- [x] CHK013 No unresolved clarification.

## Phase 3: Design
- [x] CHK014 Technical context.
- [x] CHK015 Constitution re-verified.
- [x] CHK016 Data model.
- [x] CHK017 Concrete file paths.
- [x] CHK018 Dependencies.
- [x] CHK019 Risks and mitigations.
- [x] CHK020 No constitution violation.

## Phase 4: Tasks
- [x] CHK021 Phased tasks.
- [x] CHK022 Parallel tasks marked.
- [x] CHK023 User-story tags.
- [x] CHK024 Independent tests.
- [x] CHK025 Checkpoints.
- [x] CHK026 Dependency order.

## Phase 5: Apply
- [ ] CHK027 Strict TDD RED → GREEN → REFACTOR — not fully recorded; regression tests were added during apply and then run fresh.
- [x] CHK028 Every FR has a test.
- [x] CHK029 No TODO/commented-out code in planned scope.
- [ ] CHK030 Conventional commit (not applicable; no commit requested).

## Phase 6: Verify
- [x] CHK031 `pnpm test:run` — 35 files / 158 tests.
- [x] CHK032 `pnpm lint`.
- [x] CHK033 `pnpm typecheck`.
- [x] CHK034 Coverage — 91.34% lines, 82.13% branches, 91.71% functions; Vitest thresholds enforce 80/70/90.
- [x] CHK035 Stories independently work through focused tests.
- [x] CHK036 Success criteria met locally.
- [x] CHK037 Security review — no critical/high findings; audit high clean.
- [x] CHK038 Performance design — 30 s bounded refresh and dedupe; no live load test available.

## Phase 7: Archive
- [x] CHK039 Apply progress finalized.
- [ ] CHK040 Archive (deferred; active work).
- [x] CHK041 Lessons learned recorded in apply-progress and final response.

Initial design gate passed. CHK030/CHK040 remain intentionally open: no commit
was authorized and the active spec is not archived before delivery.
