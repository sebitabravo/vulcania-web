# Comparative Regression Audit — ORIGINAL `014e7e5` vs NEW `HEAD` (8a89cad)

**Closure update:** 2026-08-16 — R1-R4 implemented locally; live Supabase remains an external gate.

Method: for every shared file, diffed both refs and checked each removed code path for
callers in the original (`git grep`). Findings marked with evidence (original `file:line`
vs new `file:line`), impact, and final verdict.

Sections 1–14 preserve the original audit snapshot and its evidence. Section 15 is
the implementation closure and supersedes the historical "new state" paragraphs
for R1–R4.

---

## 1. [CONFIRMED REGRESSION] Browser notifications for new chat messages and community posts removed

**Original behavior:** Both chat and community asked for notification permission on mount and
showed a system notification when a new message/post arrived while the tab was hidden.

- `014e7e5:components/chat-component.tsx:26,72,373` — `ensureNotificationPermission()` on mount; `notify("Nuevo mensaje", "Recibiste un mensaje en el chat comunitario")` on realtime insert.
- `014e7e5:components/community-panel.tsx:36,119` — same pattern for `"Nuevo aviso comunitario"`.
- `014e7e5:lib/browser-notifications.ts` — the whole module (`ensureNotificationPermission`, `notify`) is **deleted**; `notify()` existed precisely for the background case (`if (document.visibilityState === "visible") return`).

**New state:** zero references to `notify`/`Notification` in `components/chat-component.tsx` and `components/community-panel.tsx` (verified by grep — no hits).

**Impact:** a user with the app open in a background tab silently stops receiving new-message
and new-post alerts. Real-time delivery still works inside the tab, but the out-of-band
notification channel is gone. Nothing in the new code replaces it.

---

## 2. [CONFIRMED REGRESSION — conditional] Emergency modal lost its 5s polling fallback; live alerts now depend solely on realtime

**Original behavior:** `014e7e5:components/emergency-modal.tsx:214-215` — `checkAlert()` ran on
mount **and** `setInterval(checkAlert, 5000)` polled `alertas_volcan` every 5 seconds. This was
a plain SELECT: it worked on any database, realtime configured or not, and self-recovered from
realtime outages. The old `scripts/init.sql` had **no** realtime publication statements (grep
for `publication|supabase_realtime` in `014e7e5:scripts/init.sql` → zero hits) — the poll was
the only reason the modal worked at all.

**New state:** `contexts/alert-context.tsx:25-90` does one initial fetch (`refresh()`) plus a
`postgres_changes` subscription (`alert-context.tsx:80-83`). No interval, no re-fetch fallback.
`components/emergency-modal.tsx` consumes the context only. `scripts/init.sql:552-562` does add
the missing `alter publication supabase_realtime add table ...` statements (guarded by
`if not exists`), so **fresh installs** are covered.

**Impact:** any deployment where the database predates the new init.sql (existing Supabase
project upgraded app-only), or any realtime disruption (RLS/REALTIME errors, channel drop,
publication drift), silently freezes alert delivery: the emergency modal never fires for new
naranja/rojo alerts, with no error surfaced. The old version recovered within 5s under the same
conditions. Deploying the new app **requires** re-running the new init.sql; nothing enforces it.

---

## 3. [CONFIRMED REGRESSION — conditional] Demo mode can no longer trigger the emergency modal / change alert level

**Original behavior:** the admin panel had no role gate — `014e7e5:components/admin-panel.tsx`
and `014e7e5:hooks/use-admin-panel.ts` never check `rol`; `014e7e5:app/page.tsx` called
`useAdminPanel()` unconditionally. With `NEXT_PUBLIC_ENABLE_ADMIN_PANEL=true`, any logged-in
user — including demo users — could open the panel and change the alert level; the emergency
modal then appeared (via its DB poll). Additionally the original demo defaulted to
`DEMO_ALERTA` level **naranja** (`014e7e5:lib/demo-data.ts:7-13`), so the demo showcased a
non-green alert state out of the box.

**New state:** `app/page.tsx:51-56` gates the panel on `usuario.rol === "operator" ||
"admin"` (`hooks/use-admin-panel.ts:6`), and every demo identity is hard-coded `rol: "user"`
(`contexts/auth-context.tsx` `getDemoUser`, `lib/demo-data.ts` `DEMO_USUARIO`). The only caller
of `setDemoAlertLevel` is the admin panel (`components/admin-panel.tsx:82`), which demo users
can never open. Demo alert level also now defaults to **verde** (`lib/demo-data.ts`
`createDemoAlert`).

**Impact:** in demo mode there is now **no path** to change the alert level or see the emergency
modal/siren — the app's flagship emergency flow is undemonstrable in the portfolio/demo context.
This is the intended hardening of the role gate, but it silently killed the demo's core
demonstration path (previously reachable with `ENABLE_ADMIN_PANEL=true`).

---

## 4. [CONFIRMED REGRESSION — minor] Map "Ver RA" (Street View) action removed

**Original behavior:** `014e7e5:components/interactive-map.tsx:579` — each meeting-point popup
had two actions: "Navegar" (Google Maps directions) and "📱 Ver RA", which opened the point in
**Google Maps Street View** (`google.com/maps/@lat,lng,3a,75y,90h,90t/...streetviewpixels...`).

**New state:** `components/interactive-map.tsx:241` — the point card offers "Navegar"
(directions) and "Ver mapa" (`google.com/maps/search/?api=1&query=...`, a plain map pin view).
Street View link is gone; `git grep "Ver RA"` in HEAD → no hits.

**Impact:** users lose the ability to visually inspect a meeting point at street level before
heading there. Minor but a real removed action with no replacement.

---

## 5. [DISMISSED] Login auto-create user — preserved, moved to the backend

Original created a missing `usuarios` row client-side on `PGRST116`
(`014e7e5:contexts/auth-context.tsx`). New flow: `shouldCreateUser: true` on
`signInWithOtp` + SQL trigger `on_auth_user_created` (`scripts/init.sql:153-175`) creates the
`usuarios` row, with a read-only fallback profile in `profileFromAuthUser` while the trigger is
being deployed. Auto-create still exists in both. **Note (deploy dependency):** full mode now
requires a real Supabase phone/SMS provider — on a project without one, login fails where the
old app logged in instantly. Intentional hardening; same deployment caveat as finding 2.

## 6. [DISMISSED] Chat unread badges — now real, not regressed

Original badge was hard-coded: "Mostrar 1 mensaje no leído (sin hacer consultas adicionales a
la DB)" — `014e7e5:components/chat-component.tsx:133-146` (`mensajesNoLeidos = 1` from local
heuristics + a local "read" Set). New counts actual unread rows:
`components/chat-component.tsx:109,141,147` against the new `leido`/`fecha_lectura` columns
(`scripts/init.sql:119-120,141,475`). Works, and is accurate now.

## 7. [DISMISSED] Chat image sending — preserved

Both refs use `composeMessageWithImage`/`fileToDataUrl`/`parseMessageMedia`/`ImagePlus`
(`014e7e5:components/chat-component.tsx:433,724` vs `components/chat-component.tsx:16,199,285`).
`lib/message-media.ts` additionally hardened (2 MB cap, allow-list of types, data-URL-only
parse). No capability lost — all legacy images were data URLs, so the stricter parser does not
break stored messages.

## 8. [DISMISSED] Chat "Reset" debug button — intentional removal of an obsolete debug tool

`014e7e5:components/chat-component.tsx:485,513` reset the local "read" Set. Its semantics died
with the move to real server-side `leido` flags (finding 6). Debug/dev tool; no production
behavior lost.

## 9. [DISMISSED] Volcano monitoring parameters (sismos/SO2/temperatura) — dead code, never rendered

They lived in `014e7e5:components/volcano-status-banner.tsx` (fetched `parametros_volcan`:
`sismos_24h`, `temperatura_crater`, ...). That component was **never imported anywhere** —
`git grep "volcano-status-banner" 014e7e5` returns only its own definition
(`volcano-status-banner.tsx:149`). The live header (`volcano-status-header.tsx`, rendered by the
old page) showed only level, description and freshness — it never displayed monitoring
parameters. Deleting the banner deletes nothing users ever saw.

## 10. [DISMISSED] Map exclusion zones — new feature, absent in original

`git show 014e7e5:components/interactive-map.tsx | grep -n "circle|exclusion|radio_km"` → zero
hits. Zones are **added** in HEAD (`components/interactive-map.tsx:168-176` `L.circle` +
`DEMO_ZONAS_EXCLUSION` + zone banner). Addition, not regression.

## 11. [DISMISSED] Phone formatting onFocus/onBlur — formatting preserved; validation stricter

The onFocus/onBlur auto-restore of the `+56 9 ` prefix was defensive polish; onChange formatting
and the initial prefix remain (`components/login-screen.tsx`). **Note:** `lib/phone-utils.ts`
validation tightened from `^\+56\s?9\s?[\d\s]+$` + length ≥ 10 (accepted 9+ digits after the 9)
to exact `^\+569\d{8}$`. Numbers that previously logged in (e.g. 9 digits after the 9) now get a
clear format error. Deliberate tightening; documented in the UI message.

## 12. [DISMISSED] Demo persistence localStorage → sessionStorage — intentional hardening

`014e7e5:contexts/auth-context.tsx` stored `vulcania_usuario` in `localStorage` (forged
identity, the P0). New stores `vulcania_demo_session` in `sessionStorage`
(`contexts/auth-context.tsx`). Reload persistence **preserved**; cross-browser-restart
persistence is gone — which is the point of the fix. Instant demo login is preserved (any valid
Chilean mobile in demo mode; the old one-click "Acceso Directo (Demo)" button was replaced by
the "Entrar al monitor demo" submit).

## 13. [DISMISSED] Toast system removal — never used

`components/ui/toast.tsx`, `components/ui/toaster.tsx`, `hooks/use-toast.ts` were referenced
only by each other in the original (grep → only self-references). Dead code.

## 14. [DISMISSED — note] Emergency sound default

Old modal comment: "el sonido SIEMPRE debe sonar" (`014e7e5:components/emergency-modal.tsx`).
New modal defaults sound **off** when `prefers-reduced-motion: reduce` and adds a persistent
mute (`components/emergency-modal.tsx`, `SOUND_KEY`). Intentional accessibility feature; worth
knowing that reduced-motion users get no siren by default.

---

## Definitive list of real regressions at audit time

| # | Regression at audit time | Severity | Condition / closure |
|---|---|---|---|
| 1 | Browser notifications for new chat messages and community posts removed | Medium | Closed locally: opt-in utility/toggle + two callers; permission is now explicit. |
| 2 | Emergency alert delivery lost its 5s polling fallback and old DBs may lack publication | High (silent) | Closed in code: 30 s safety refresh + status + doctor/RPC. External: apply `init.sql` and run live doctor/Realtime smoke. |
| 3 | Demo mode could no longer change alert level or trigger modal | Medium | Closed locally: demo-only access for user identity, still simulation-labeled; full role gate unchanged. |
| 4 | Map "Ver RA" (Street View) action removed | Low | Closed locally: restored via official Maps pano URL and tested. |

Everything else in the hypothesis list (auto-create user, unread badges, image sending,
exclusion zones, monitoring parameters banner, toast, phone formatting, demo persistence) was
dismissed as preserved, improved, dead code, or intentional hardening — see findings 5-14 for
the evidence.


## 15. Closure verification — 2026-08-16

### R1 — alertas y publication

- `contexts/alert-context.tsx` now performs an initial fetch plus a bounded 30 s
  safety refresh, deduplicates in-flight requests, exposes `realtimeStatus` and
  preserves the last valid alert when a later query fails.
- `components/volcano-status-header.tsx` keeps the last alert visible and shows
  an actionable warning when the refresh/channel is unhealthy.
- `scripts/init.sql` adds idempotent `verificar_publicaciones_realtime()`; it
  returns only four booleans and is granted to the diagnostic roles.
- `scripts/doctor.ts` calls the RPC and fails with a rerun instruction if any
  publication is absent. This code path is covered by the SQL/doctor contract
  tests. It is not proof that a remote project has been migrated: run
  `scripts/init.sql`, `pnpm doctor` and `pnpm test-realtime` against the target
  Supabase project before deploy.

### R2 — browser notifications

`lib/browser-notifications.ts` is restored with SSR/permission/visibility guards;
`components/notification-toggle.tsx` requests permission only after a visible
user action. Chat and community notify only for incoming events from another
user. Utility, toggle and listener tests cover the behavior.

### R3 — demo flagship flow

`app/page.tsx` permits a demo `user` to open the local admin console when the panel
flag is enabled. Full mode still requires `operator`/`admin`; demo mutations stay
in memory and remain labeled `Simulación demo`.

### R4 — micro-parity

`interactive-map.tsx` restores `Ver RA` using `api=1&map_action=pano&viewpoint=...`;
invalid coordinates produce no marker or active external link; login restores the 9
help text and the shell restores `Bienvenido, {usuario.nombre}`.
The product report's former image-loss claim is explicitly dismissed: both image
paths remain implemented and are covered by tests.

### Final verdict

No listed regression remains unaddressed in local code. The only remaining blocker
before a real deploy is external evidence: the target Supabase project must be
re-provisioned and pass live doctor/Realtime/OTP/RLS checks.
