# Audit W2 — Operations / CI / Engineering Process

Date: 2026-08-16 · Scope: .github/workflows, package.json, next.config.mjs, scripts/{deploy.js,doctor.ts,validate-env.ts}, .env.example (existence only), .gitignore, README.md, TESTING.md, SUPPORT.md · Read-only.

Context limitation: no shell access in this session (`git log`, `gh workflow list`, `git ls-files` could not be run). Git state taken from the session snapshot (branch main, clean, last commit 014e7e5). File existence verified via filesystem globs.

## Findings

1. **[P1][ops] .github/workflows/ (only `reviewer-auto-pr.yml`) — no lint/typecheck/test/build CI gate exists.** The sole workflow is an advisory AI reviewer; nothing runs `lint`, `tsc`, `test:run` or `build` on PR or push. The quality gate that SUPPORT.md:6-8 describes ("semanal: pnpm lint; pnpm test:run; pnpm build") is a manual, local, unenforced ritual. — Impact: every regression that local runs miss ships to prod; the gate exists only as documentation. — Recommendation: add `.github/workflows/ci.yml` (minimal version below) and enforce it via branch protection on main.

2. **[P1][ops] next.config.mjs:3-8 — both build-time checks disabled: `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true`.** With no CI and a local deploy script, `next build` is the last line of defense and it is neutered on both axes; TS errors and lint errors compile and deploy. — Impact: type errors and lint violations reach production silently. — Recommendation: remove both flags once CI exists; let the CI build job be the gate.

3. **[P1][ops] .gitignore:36-37 — both lockfiles are gitignored and none exists on disk.** `package-lock.json` and `pnpm-lock.yaml` are ignored; a filesystem scan found no lockfile. Installs are floating: `pnpm install --frozen-lockfile` is impossible in CI, and any transitive dependency release can change what builds and what ships, with zero diff review. Aggravated by package.json:28 `"leaflet": "latest"` (unpinned, no lockfile to pin it). — Impact: non-reproducible builds; supply-chain changes land silently; CI cannot be deterministic. — Recommendation: delete lines 36-37 from .gitignore, run `pnpm install` to generate `pnpm-lock.yaml`, commit it, and use `--frozen-lockfile` in CI. Consider pinning leaflet to a fixed version.

4. **[P2][ops] scripts/deploy.js:15 — deploy runs `npm run build` while the project is pnpm (package.json:59 `packageManager: pnpm@10.10.0`, README/SUPPORT/doctor.ts:37 all say pnpm).** `npm run` happens to resolve pnpm's `node_modules/.bin` symlinks so it often works locally, but the contract is mixed tooling: on a fresh clone with no install, or in any environment where pnpm is the only configured manager, the deploy build fails or resolves differently. — Impact: deploy-time failures and tooling drift. — Recommendation: `execSync('pnpm run build', ...)` in deploy.js (or `pnpm exec next build`).

5. **[P2][ops] scripts/deploy.js:50-58 — `vercel --prod` deploys directly to production from a local machine: no preview, no promotion step, no rollback path, no commit correlation.** Step 2 (`vercel env ls`, line 25) is only a connectivity check, not a config audit. Whoever holds local Vercel auth can ship unreviewed, unrolled-back production from any laptop. — Impact: irreversible prod mutations with no revert story; combined with findings 1-2, broken code can reach prod with no automated check. — Recommendation: move deployment to CI (deploy job on push to main, or Vercel git integration) and keep `vercel --prod` out of developer hands; keep a preview deploy locally if desired.

6. **[P2][ops] package.json:17 — `"test-realtime": "npx tsx scripts/test-realtime.ts"` references a file that does not exist** (scripts/ contains only deploy.js, doctor.ts, init.sql, validate-env.ts). — Impact: `pnpm test-realtime` fails with module-not-found; dead script confuses contributors. — Recommendation: delete the script entry, or implement the realtime test and add it to the test suite.

7. **[P2][ops] .gitignore:21-22 — only `.env` and `.env.local` are ignored; `.env.production`, `.env.test`, `.env.*` variants are NOT ignored.** Next.js loads those files; any of them containing real keys would be committed without a block. — Impact: accidental secret exposure. — Recommendation: replace with `.env*` plus a `!.env.example` exception (keep the example template). The README.md:99 advice ("nunca subas .env*") is only as strong as the ignore rule.

8. **[P3][ops] README.md:73 — `cp .env.example .env.local` references a file that does not exist.** No `.env.example` anywhere in the repo (verified recursively). The de-facto template is ENV_VARS in scripts/validate-env.ts:14-49. — Impact: onboarding friction; new contributors must reverse-engineer the template. — Recommendation: add `.env.example` with placeholder values (names only, no real keys) and the `!.env.example` ignore exception from finding 7.

9. **[P3][ops] package.json:9 — `"lint": "next lint"` uses a command deprecated in Next 15 (removed in 16).** The repo already has a flat config (eslint.config.mjs, FlatCompat over next/core-web-vitals + next/typescript) which is what ESLint 9 uses; `next lint` is the legacy path. The leftover `.eslintrc.json` (legacy format, ignored under flat config) adds confusion. — Impact: deprecation warnings, and the lint command dies on the Next 16 upgrade. — Recommendation: `"lint": "eslint ."` and delete `.eslintrc.json`.

10. **[P3][ops] vitest.config.ts:12-22 — coverage is reported but has no thresholds.** With no CI and no quality floor, coverage is informational only. — Impact: coverage can silently regress between releases. — Recommendation: add thresholds (e.g. lines 80, branches 70, functions 90) once CI runs it.

11. **[P3][ops] Observability — no Sentry or equivalent.** README.md:115 lists Sentry as an optional roadmap item; package.json has no error-tracking dependency; lib/logger.ts is a console logger. — Impact: production errors are invisible until a user reports them; no performance monitoring. — Recommendation: keep as roadmap item with an explicit owner and quarter; until then, at least log client errors somewhere queryable.

12. **[P3][ops] SUPPORT.md — maintenance checklists exist (weekly 5-10 min, monthly 15-20 min, incident quick-path) but have no owner, no trigger, no definition of done.** Also the weekly checklist itself runs `pnpm lint` (deprecated, finding 9). — Impact: checklists are aspirational; nothing enforces them and no one is accountable. — Recommendation: name an owner, attach the checklist to a recurring calendar trigger, and replace the lint command.

13. **[P3][ops] .github/workflows/reviewer-auto-pr.yml:16-21 — reviewer is advisory, not a merge gate.** It comments only, is gated on non-draft/non-fork (lines 17-19, good), uses minimal permissions (contents: read, pull-requests: write, lines 7-9), and runs an admin-set command from `vars` (line 39) on a self-hosted runner. Notes: no `paths:` filter, so docs-only PRs still consume the 15-min timeout; executing PR code via that command on a self-hosted runner is acceptable only because fork PRs are excluded. — Impact: the only automated feedback loop cannot block a merge. — Recommendation: decide explicitly whether the reviewer becomes a required check; add a paths filter for docs-only PRs.

## Minimal CI recommendation

New `.github/workflows/ci.yml`, triggered on `pull_request` and `push` to main:

- **Job `checks`** (lint + typecheck + test, ~1-2 min):
  - `actions/checkout@v4`
  - `pnpm/action-setup@v4` (reads `packageManager` field; add a `version: 10.10.0` fallback)
  - `actions/setup-node@v4` with `node-version: 22`, `cache: pnpm`
  - `pnpm install --frozen-lockfile` (requires finding 3 to be fixed first)
  - `pnpm lint` (after finding 9 fix)
  - `pnpm exec tsc --noEmit` (add a `"typecheck": "tsc --noEmit"` script — none exists today)
  - `pnpm test:run`
- **Job `build`** (the real gate, after removing next.config.mjs flags):
  - Same checkout/setup/install, then `pnpm build`
- Concurrency group per PR with `cancel-in-progress: true` (mirror the reviewer workflow).
- Node 22 vs 20 is an open question — package.json has no `engines` field.

**Branch protection on main (required to make CI meaningful):** require `checks` and `build` to pass, require a PR (no direct pushes), require review. Current protection state could not be verified from this session (no `gh` access).

**Deploy:** once CI is green, add a `deploy` job (push to main only) running `vercel --prod --token=${{ secrets.VERCEL_TOKEN }}`, or enable the Vercel git integration; either replaces the local `vercel --prod` in deploy.js (finding 5).

## Out-of-scope one-liners

- next.config.mjs:9-11 `images.unoptimized: true` — perf/traffic cost, covered in w1-performance.
- No `vercel.json` in repo — build settings live in the Vercel dashboard, unversioned.
- package.json:28 `"leaflet": "latest"` — unpinned; absorbed by finding 3 but worth its own pin.
- README.md:70 clone URL is a placeholder (`tu-usuario`).
- No `engines` field in package.json — CI Node version is unconstrained.
- No dependabot/renovate config; SUPPORT.md:16 suggests manual `pnpm outdated` as the only dependency update path.
- reviewer workflow has no `paths:` filter — every PR pays the 15-min runner budget (finding 13).

## Open questions

1. Is main branch-protected today? Who can push to it directly? (Unverifiable without `gh`.)
2. Is production deployed via deploy.js by hand, or does a Vercel git integration already exist? If the latter, deploy.js is redundant and should be deleted.
3. Who holds Vercel auth — single account or a team project?
4. Should the AI reviewer become a required (blocking) check, or stay advisory?
5. Node version target for CI: 20 LTS or 22? (No `engines` field to read.)
6. `test-realtime` (package.json:17): was it a planned Supabase realtime test that was dropped — resurrect or delete?
7. Sentry: commit to it with an owner/quarter, or keep console-only for now?
