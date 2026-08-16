# Vulcania Web — Defect Audit (week 1)

- Date: 2026-08-16
- Scope: package.json, next.config.mjs, tsconfig.json, eslint.config.mjs, .eslintrc.json, lib/*, scripts/*, contexts/auth-context.tsx, __tests__/* (read-only)
- Method: full read of whitelisted files + read-only shell evidence (git grep, git log, grep, node -e, pnpm test:run)

## Test-run evidence

`pnpm test:run` — **DID NOT RUN (exit 1)**: `sh: vitest: command not found`, plus `WARN Local package.json exists, but node_modules missing`. **0 tests executed**; suite state unknown. The checkout has no `node_modules` and no lockfile on disk (see F8, F16). Installing is blocked by audit constraints, so green/red cannot be verified this round.

## Findings

1. `[P1][security] contexts/auth-context.tsx:167-169` — login fallback runs `supabase.from("usuarios").select("*")` (entire table to the browser) whenever exact/normalized lookups miss. `scripts/init.sql:315-326` enables RLS only on `puntos_encuentro`; `usuarios` (nombres + teléfonos) is fully readable/writable by the anon key, which this code path depends on. Impact: any visitor can dump the whole user directory (PII) through the public client, and every failed login downloads the full table. Recommendation: replace client-side full scan with a server-side lookup (Supabase RPC with security definer or edge function), add RLS on `usuarios`, and paginate.

2. `[P2][logging] contexts/auth-context.tsx` — 25 raw console statements (17 `console.log`, 7 `console.error`, 1 `console.warn`: lines 43, 87, 93, 115, 119, 125, 137, 145, 154, 165, 173, 195, 206, 219, 234, 240, 253, 266, 271, 282, 288, 297, 307, 317, 320) bypass `lib/logger.ts`, which the rest of the app uses. Lines 173-180 and 195-201 log every other user's phone numbers and names to the console on each failed login. Impact: PII in devtools/console capture, no level filtering in production. Recommendation: route through `logger.debug/warn/error` and strip user data from messages.

3. `[P2][build] package.json:17` — script `test-realtime` points at `scripts/test-realtime.ts`, which was deleted in commit `dba3266` ("Removed outdated test scripts for user search and real-time functionality"); the file never existed on HEAD and `pnpm test-realtime` fails. Impact: broken developer command. Recommendation: delete the script entry or restore the file (docs do not reference it).

4. `[P2][build] scripts/deploy.js:15` — runs `npm run build` while the project declares `packageManager: pnpm@10.10.0` (package.json:59) and all docs use pnpm. Also invokes the `vercel` CLI (lines 25, 52) which is not declared in package.json (global dependency). Impact: deploy builds with the wrong package manager/layout, fails where npm is absent, and depends on an undeclared global tool. Recommendation: `pnpm run build`; declare `vercel` in devDependencies or fail with a clear message.

5. `[P2][config] demo-mode detection duplicated 5x with divergent semantics` — `lib/app-config.ts:12` and `scripts/validate-env.ts:59-62` default to demo when Supabase env is missing (auto-demo), while `lib/supabase.ts:8`, `scripts/doctor.ts:18-20`, and `scripts/deploy.js:10` require explicit `NEXT_PUBLIC_DEMO_MODE=true`. Impact: same environment yields different modes per module — doctor.ts fails while the app runs demo; deploy.js prints the wrong mode. Recommendation: single source of truth (export from `lib/app-config.ts`) with one semantic, consumed by all five sites.

6. `[P2][dead-code] hooks/use-toast.ts + components/ui/toaster.tsx` — only mutual references (toaster.tsx:3,14 imports useToast; no caller of `toast()`/`useToast()` elsewhere; no `<Toaster>` mounted). `hooks/use-mobile.tsx` has zero references repo-wide. `@radix-ui/react-toast` (package.json:24) is then unused. Impact: dead code plus an unused dependency. Recommendation: delete the three files and the dependency.

7. `[P2][config] next.config.mjs:3-8` — `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true` both set. Impact: builds pass with lint/type errors; combined with F4 the deploy path can ship broken code with zero static gates. Recommendation: remove both ignores; run `tsc --noEmit` + ESLint in CI/pre-commit.

8. `[P2][reproducibility] no lockfile` — `.gitignore:36-37` ignores `package-lock.json` and `pnpm-lock.yaml`; neither exists on disk nor in git history. `leaflet: "latest"` (package.json:28) amplifies drift. Impact: non-reproducible installs, supply-chain risk, CI diverges from local. Recommendation: stop ignoring, commit `pnpm-lock.yaml`, pin leaflet.

9. `[P2][tooling] package.json:9` — `"lint": "next lint"`; `next lint` is deprecated in Next 15.5 (removed in Next 16) and the repo pins `next: ^15.5.12`. With F7 there is effectively no lint gate. Recommendation: switch to the ESLint CLI (`eslint .`) and wire it into CI; not runnable here (node_modules absent).

10. `[P3][config] .eslintrc.json` — legacy eslintrc format; ESLint ^9.28.0 (package.json:50) only reads flat config, so this file is dead next to `eslint.config.mjs` (which already extends the same rule sets via FlatCompat). Impact: two configs, one ignored, drift risk. Recommendation: delete `.eslintrc.json`.

11. `[P3][error-handling] lib/audio-unlock.ts:35-37 and lib/browser-notifications.ts:20-22` — empty `catch { /* no-op */ }` swallow all failures (audio unlock rejection, `new Notification` failure). Impact: silent breakage, undebuggable in production. Recommendation: log through `logger.warn` (at minimum) and degrade gracefully.

12. `[P3][naming] package.json:2` — package name is `my-v0-project`, a v0 scaffold leftover. Impact: confusing artifacts, potential registry collision. Recommendation: rename to a project-specific name.

13. `[P3][logic] lib/phone-utils.ts:12` — `numeroLimpio.length < 10` accepts 5-7 digits after `+569` (canonical Chilean mobile is 8) and any longer number; e.g. `+56912345` validates true. Impact: invalid phone numbers pass validation. Recommendation: enforce the exact canonical length (12 chars clean) and cap the max.

14. `[P3][tests] __tests__/auth-utils.test.ts:10-40` — redefines `normalizarTelefono`/`generarVariantesBusqueda` as local copies instead of importing the production functions from auth-context (or `lib/phone-utils`). Impact: tests exercise a fork, not the shipped code; production changes silently go untested. Recommendation: extract the helpers to `lib/` and import them.

15. `[P3][tests] __tests__/auth-context.test.tsx` — named for auth-context but never renders `AuthProvider`; only asserts `APP_CONFIG` properties and a phone regex duplicated from phone-utils. Impact: login/logout/demo flows have zero coverage. Recommendation: test `AuthProvider` flows with mocked `@/lib/supabase`.

16. `[P3][tests] suite cannot run in this checkout` — `node_modules` missing, no lockfile committed (F8); `pnpm test:run` exits 1 (`vitest: command not found`). Impact: no verification gate exists until `pnpm install` + committed lockfile; TESTING.md:201 claims CI runs `pnpm test:run`, unverifiable from the whitelist. Recommendation: `pnpm install`, commit the lockfile, add the suite to CI.

17. `[P3][scripts] scripts/doctor.ts:9-17` — validates only 6 of the 12 tables created in `scripts/init.sql`; misses `mensajes_chat` (the chat feature), `zonas_exclusion`, `acciones_requeridas`, `configuraciones_nivel`, `recomendaciones_nivel`. Impact: doctor reports healthy while the chat schema is broken. Recommendation: validate all app-facing tables.

18. `[P3][scripts] scripts/validate-env.ts:143` — `console.clear()` wipes the user's terminal before validation output. Impact: erases prior logs in terminal/CI contexts. Recommendation: remove.

19. `[P3][logic] contexts/auth-context.tsx:48-51` — SSR branch sets `loading = false` immediately and the client effect also resolves it to false; the flag never reflects real auth state, so no loading UI ever shows and there is a logged-out flash risk. Impact: dead state, minor hydration UX. Recommendation: keep `loading` true until the storage/DB check resolves.

## Out-of-scope one-liners (observed via grep only, not audited)

- `components/chat-component.tsx:111` fetches all `usuarios` to the client (same pattern as F1) — outside whitelist.
- `components/*` otherwise use the leveled `logger` consistently — `contexts/auth-context.tsx` is the sole console.log outlier in app code.
- `.github/workflows/reviewer-auto-pr.yml` is the only workflow; whether CI runs lint/tests is unverified (`.github/` excluded from scope).
- `hooks/use-admin-panel.ts` and `app/` (layout/page/error) not audited beyond grep hits; `app/error.tsx` correctly uses `logger.error`.
- `scripts/init.sql` has no seed-idempotency guard around `CREATE TABLE` (plain statements, rerun fails) — read for cross-reference only.

## Open questions

1. `node_modules` absent: fresh checkout or deliberately stripped? Blocks the test gate (F16).
2. Auto-demo fallback (`app-config.ts:12`, `validate-env.ts:59-62`) vs explicit-only (`supabase.ts:8`, `doctor.ts:19`, `deploy.js:10`): which semantic is intended? (F5)
3. No RLS on `usuarios` (init.sql secures only `puntos_encuentro`): intentional prototype trade-off or oversight? Determines real-world severity of F1.
4. Lockfile ignores (`.gitignore:36-37`): intentional? Committing `pnpm-lock.yaml` is strongly recommended (F8).
5. Restore `scripts/test-realtime.ts` or delete the `package.json` entry? (F3)
