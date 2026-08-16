# Comparative Functional Review — vulcania-web

Old ref: `014e7e5` · New ref: `8a89cad` (HEAD, redesign commit `ebbc717`)
Scope: user-facing functionality. Dead code is flagged as such; deleted dead code is not counted as lost functionality.

## Verdict per feature area

| Area | Original (014e7e5) | New (HEAD) | Verdict |
| --- | --- | --- | --- |
| Login / auth | Phone-only lookup in `usuarios` table + auto-create row; UI promised an SMS code but no code step existed | Real Supabase Auth OTP (signInWithOtp + verifyOtp, 6-digit code stage, session restore) | IMPROVED |
| Volcano status | Live header with fetch + realtime, "Hace Xh Ym", silent `null` on failure (no error UI) | Header via alert-context: 60s staleness timer, bounded 30s safety refresh, channel status, error fallback, stale warning, fuente/referencia display, "Qué hacer ahora" card, aria-live | IMPROVED |
| Map | 825L map: OSM + Esri satellite layer switcher, Street View "Ver RA", volcano height popup, scale control, no exclusion zones, no realtime, no error UI | 245L map: exclusion zones per alert level, realtime meeting points, accessible card list, error/empty/loading states, nav disabled when full, XSS-safe tooltips, restored Street View URL | IMPROVED (satellite/scale/altitude remain intentionally absent) |
| Community | Realtime INSERT reload + browser notify, sentiment badge (Alerta/Seguro/Info), 500-char limit, 20 posts, `alert()`-based user check | Realtime `*` channel, hidden-tab notification opt-in, error/retry UI, Cmd/Ctrl+Enter submit, 30 posts, image validation (2 MB), interactive demo feed | IMPROVED (sentiment heuristic absent; images preserved) |
| Chat | Browser notify on new message, fake unread (always 1, local Set), user-visible "Reset" debug button, image upload, no error UI | Real unread counts persisted via `leido` update, mark-read on open, hidden-tab notification opt-in, IME guard, image validation, connection indicator, demo CRUD | IMPROVED (debug reset intentionally absent; images preserved) |
| Admin | Direct table inserts, `Math.random` params, `alert()` confirmations, Ctrl+Shift+A instructions card, no demo support | Deterministic presets, RPC calls, two-step confirm dialog, red-level guard, inline errors, rol-gated full mode, demo-only local access | IMPROVED |
| Emergency modal | 5s polling, sound always on (no mute), full-screen overlay, dev-only test buttons | alert-context push plus bounded 30s safety refresh, mute toggle persisted (respects prefers-reduced-motion), emergency contacts cards + SENAPRED link, simulation badge, focus management | IMPROVED |
| Browser notifications | `lib/browser-notifications.ts` live: Notification on new chat message and new community post when tab hidden | Restored via explicit header toggle; chat/community notify only incoming hidden-tab events | RESTORED (opt-in) |
| Toast infra (use-toast, toast.tsx, toaster.tsx) | Dead — no consumers outside the toast files themselves | Deleted | EQUAL (no user-facing change) |
| use-mobile hook | Dead — zero consumers | Deleted | EQUAL (no user-facing change) |
| volcano-status-banner.tsx (1075L) | Dead — never imported or rendered (live status was volcano-status-header.tsx) | Deleted; header rewritten | EQUAL (no user-facing change) |

## Findings

### F1 — Old login was not real SMS auth (IMPROVED)
The old screen promised "Ingresa tu número para recibir un código de verificación" (`old components/login-screen.tsx:101`), but after a fake 2s delay (`:47`) it called `login(telefono)` directly — no code entry stage existed. Old `auth-context.login` was a phone lookup in the `usuarios` table with auto-creation on PGRST116 (`old contexts/auth-context.tsx:131-284`); any valid phone got a session with zero verification. Old screen even leaked a debug line to end users: `Actual: "{telefono}" ({telefono.length} chars)` (`old login-screen.tsx:158-160`).
New flow: `signInWithOtp` with `shouldCreateUser` (`contexts/auth-context.tsx:181-187`), 6-digit `verifyOtp` with expiry handling (`:198-220`), pending-phone state, "Cambiar número" reset, session restore via `getSession` + `onAuthStateChange` (`:111-143`), real `signOut` (`:239`). Demo remains local-only (sessionStorage, `:165-174`). This is the largest single functional gain: the old product claimed verification it never performed.

### F2 — Volcano status: error, staleness, provenance (IMPROVED)
Old header returned `null` on fetch failure (`old volcano-status-header.tsx:145`) and on missing data — user saw nothing. New header shows a loading shimmer, an error fallback ("No pudimos actualizar el estado. Revisa los canales oficiales antes de actuar.", `components/volcano-status-header.tsx:32-41`), a stale-data warning ("Información posiblemente desactualizada", `:89`) driven by a 60s freshness timer, the alert `fuente`/`referencia`, and an action card ("Qué hacer ahora", `:93-101`). State moved from the old refreshKey remount pattern (`old app/page.tsx:25-30, 80`) to a single `AlertProvider` with realtime + demo event (`contexts/alert-context.tsx:80-90`), so all surfaces (header, map, emergency modal, login page) share one source.

### F3 — Dead code deletions were genuinely dead (EQUAL)
- `components/volcano-status-banner.tsx` (1075L): `git grep` at 014e7e5 finds no import anywhere; only self-reference. The live banner was `volcano-status-header.tsx` (185L), which was rewritten, not deleted.
- Toast infra (`hooks/use-toast.ts`, `components/ui/toast.tsx`, `components/ui/toaster.tsx`): only consumer of `useToast` is toaster itself (`old toaster.tsx:14`); no app component used it.
- `hooks/use-mobile.tsx`: zero consumers at 014e7e5.
Deleting them removed nothing a user could see.

### F4 — Browser notifications: restored with explicit opt-in
`lib/browser-notifications.ts` was live at 014e7e5: imported by chat (`old chat-component.tsx:26`) and community (`old community-panel.tsx:17`); `notify(...)` fired on new incoming chat message (`old chat:373`) and new community post (`old community-panel.tsx:119`), gated by `document.visibilityState === "visible"` and permission. The closure restores `lib/browser-notifications.ts` with an SSR-safe, fail-closed API and adds `components/notification-toggle.tsx`. Chat and community notify only for events from another user, only with permission `granted`, and only when the tab is hidden. Permission is no longer requested automatically on mount.

### F5 — Map: core preserved, edge features removed and Street View restored (IMPROVED with losses)
Lost: OSM/Satellite layer switcher, volcano popup with altitude and scale control. Restored: Street View `Ver RA` with the documented Google Maps URL `api=1&map_action=pano&viewpoint=...`. Gained: exclusion-zone circles per alert level, realtime meeting-point updates, accessible card list with capacity/time/security, "Navegar" disabled when a point is full or its coordinates are invalid, no external map/Street View href for invalid coordinates, loading/error/empty states, and XSS-safe tooltips. For an emergency tool, exclusion zones + realtime outweigh satellite tiles.

### F6 — Community: sentiment heuristic intentionally absent; images and notifications preserved (IMPROVED)
Old posts carried a keyword-classified badge (peligro/emergencia/evacuación → "Alerta", seguro/tranquilo/bien → "Seguro", else "Info"). New feed keeps a static "Comunitario" badge and intentionally omits the heuristic classifier, but retains image upload with 2 MB validation, Cmd/Ctrl+Enter, char counter, error/retry UI, empty state, `autor_nombre`, 30-post window, interactive demo feed and now hidden-tab notifications. The classifier was keyword heuristics, not a verified signal.

### F7 — Chat: real unread counts and restored notifications (IMPROVED)
Old unread was cosmetic: a local `Set` always showing 1, and a user-visible "Reset" debug button. New chat counts real unread rows and persists mark-read on conversation open, adds IME guard, connection indicator, 200-message cap, full demo CRUD, image upload validation and a hidden-tab notification for incoming messages. The debug reset remains intentionally removed.

### F8 — Admin: destructive actions hardened (IMPROVED)
Old panel wrote directly to tables with `Math.random` parameters (`old admin-panel.tsx:328-361`), confirmed with `alert()` (`:319`), and reset meeting points with a `gte("capacidad", 0)` hack (`:250`). New panel uses RPCs (`cambiar_nivel_alerta`, `cambiar_estado_punto_encuentro`, `resetear_puntos_encuentro`) for a central audit trail, deterministic `PARAMETER_PRESETS` per level, a two-step confirm dialog with a red-level guard ("Confirma solo si existe un respaldo oficial (RAV/REAV)"), inline status/error instead of `alert()`, and is rol-gated (`operator`/`admin`) plus gated by `APP_CONFIG.enableAdminPanel` (`app/page.tsx:51-56`). Ctrl+Shift+A shortcut kept (`hooks/use-admin-panel.ts:19`), now with an input/textarea guard and Escape-to-close, and a visible "Operador" button replaces the old instructions card.

### F9 — Emergency modal: usable instead of hostage (IMPROVED)
Old modal: 5s polling, sound "SIEMPRE debe sonar" with no mute (deliberate, `old emergency-modal.tsx:79`), full-screen opaque overlay, dev-only forceEmergency/Reset test buttons. New modal: driven by the shared alert context, Radix Dialog with `role="alertdialog"` and focus management, sound mute toggle persisted in localStorage and defaulting off under `prefers-reduced-motion` (`components/emergency-modal.tsx:26-36, 91-100`), emergency contacts as tappable cards with declared source, SENAPRED link, `fuente` + timestamp display, simulation badge for demo/es_simulacion alerts. The old always-on sound is a deliberate product choice, but forcing audio with no off switch and no reduced-motion respect is a genuine accessibility regression the new version fixes. Modal was live in both (mounted in `app/layout.tsx:29` old / `:41` new).

### F10 — Codec/perf hygiene (IMPROVED)
New `app/page.tsx` lazy-loads map, community, chat and admin via `next/dynamic` with per-panel loading states (`:24-38`), while the old page statically imported all four (`old app/page.tsx:12-15`). Old map used triple `setTimeout` invalidateSize hacks and injected CSS via `document.head.insertBefore`; new map uses a ResizeObserver. Old header and map each fetched `alertas_volcan` on every refreshKey remount; new code shares one realtime-fed context.

## Summary

The product remains functionally **BETTER** after closure: OTP, status transparency, exclusion zones, realtime, accessible lists, real unread state, RPC hardening and emergency provenance remain gains; browser notifications and Street View are restored with safer opt-in/URL behavior. Satellite tiles, scale/altitude popup detail and the heuristic sentiment badge remain intentional scope losses. The local implementation closes R1-R4, while an actual Supabase project still needs `init.sql` plus a successful live `doctor`/Realtime smoke.
