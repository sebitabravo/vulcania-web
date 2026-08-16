# Vulcania — Comparative Product Audit

**Scope:** Feature-parity audit between ORIGINAL `014e7e5` (main, pre-redesign) and NEW `8a89cad` (feat/vulcania-audit-implementation, redesign commit `ebbc717`).
**Method:** Original side read via GitHub raw + tree API (61-file inventory, no app/api routes, no middleware, no service worker); NEW side read from the local working tree. Both are production-user-facing flows; demo-mode differences are noted per flow.
**Date:** 2026-08-16

---

## 1. Flow-by-flow parity table

| Flow | ORIGINAL capabilities | NEW capabilities | Parity | Lost (specific) | Gained (new) |
|---|---|---|---|---|---|
| **Login** | Phone field + fake "Enviando SMS…" 2 s delay, phone lookup + auto-create in `usuarios`, localStorage session, "Acceso Directo (Demo)" button | Supabase Auth OTP (phone → 6-digit code, `verifyOtp`), Chilean-phone validation, demo mode via `sessionStorage`; volcano status + alert badge visible **before** login | **FULL** | — | Real OTP auth; roles (user/operator/admin); pre-login public status shell; phone validation |
| **Volcano status header** | Gradient card: icon, "Volcán Villarrica" + level label, description, relative time | Badge + description, "Qué hacer ahora" action card per level, Fuente/Referencia, staleness warning, simulation badge, es-CL datetime | **FULL** | — | Action card; fuente/referencia; stale-data warning; simulation labeling; proper datetime |
| **Map** | OSM + Satélite (Esri) layer switcher, scale control, volcano marker, color-coded points, full popups with "Navegar" + "Ver RA" (Street View), presets | Single CARTO dark basemap, volcano marker, points, tooltips + selection pan, "Navegar" + "Ver mapa" + restored `Ver RA` URL, presets, legend, realtime on `puntos_encuentro`, exclusion-zone circle per alert level, accessible textual point list, reduced-motion | **PARTIAL** | Satellite layer + switcher; security-tier marker colors; full popup incl. coordinates; scale control (cosmetic) | Exclusion zone + legend; accessible list; realtime point updates; keyboard flow; Street View restored |
| **Community** | Feed (max 20), auto-categorization via keyword match, images as data URLs, realtime INSERT, browser notification per post, 500-char limit | Feed (max 30), static "Comunitario" badge, `autor_nombre`, realtime, explicit opt-in hidden-tab notification, Ctrl/Cmd+Enter submit, 1000-char limit, images with 2 MB validation | **PARTIAL** | Auto-categorization heuristic | Author name (PII-safe); bigger feed; Ctrl+Enter; image validation; restored notification |
| **Chat (1:1)** | Private 1:1 conversations, flat "1" unread badge (9+ cap), images, realtime channels, wifi indicator, "Reset" debug button | Private 1:1 with conversation list, real unread counts + read receipts, `perfiles_publicos`, single realtime channel, hidden-tab notification opt-in, 1000-char limit, Enter to send, images with validation | **PARTIAL** | "Reset" debug button (intentional) + old debug affordance | Real unread counts + read receipts; mark-read on conversation open; higher char limit; restored notification and image validation |
| **Admin / operator** | "Panel de Administración — Simulador de Alertas", **no auth gate** (Ctrl+Shift+A for anyone), change level with generated params, occupancy, moderation and `window.confirm` | "Consola de operador", full mode gated by `rol operator/admin` + `enableAdminPanel`, demo-only local access for the portfolio, RPC level/point changes with confirm dialog + rojo double-confirmation, moderation with authors, audit note, demo read-only mode | **FULL** | — (open full-mode access removed as security hardening) | Role/RPC/RLS; audit trail; confirm dialogs; moderation; simulation-vs-real labeling; demo flagship flow restored |
| **Emergency modal** | Full-screen overlay, polls every 5 s, naranja/rojo triggers, "🚨 EMERGENCIA VOLCÁNICA"/"⚠️ ALERTA VOLCÁNICA", "🚨 EVACUACIÓN INMEDIATA REQUERIDA", **continuous sound with NO mute** (naranja 3 beeps/4 s, rojo 8 beeps/3 s), "He Leído y Entiendo la Alerta", "133 (Bomberos) o 131 (Carabineros)" plain text | Radix `alertdialog`, realtime-driven via AlertContext, mute toggle persisted (`vulcania-alert-sound`), `prefers-reduced-motion`, evacuation guidance per level, emergency contacts as **tappable `tel:` links 131/132/133** + SENAPRED link, alert-key dedup, focus management | **FULL** | — | Mute toggle (persisted); tappable tel links + SENAPRED source; SENAPRED link; focus management; shared `AudioContext` unlock |
| **Notifications** | Browser notifications via `lib/browser-notifications.ts`, two real hidden-tab triggers | Explicit header toggle; `notify` only for incoming chat/community events with `granted` permission and hidden tab | **RESTORED (OPT-IN)** | Automatic permission request on mount (intentionally removed) | Privacy-safe consent and fail-closed behavior |

---

## 2. Numbered LOST capabilities at the initial audit snapshot (with evidence)

The list below is historical. R1–R4 were implemented after that snapshot; the
closure status is in §5. In particular, the image-loss entries are explicitly
dismissed because the current code still contains both image paths.

Core losses — user-visible in ORIGINAL, gone in NEW:

1. **Browser notifications** — The original module and two callers were real. The closure restores `lib/browser-notifications.ts`, adds the visible `NotificationToggle`, and wires both callers back with hidden-tab/permission/own-event guards. The new behavior is opt-in instead of requesting permission on mount.
2. **Satellite map layer + layer switcher** — ORIGINAL `components/interactive-map.tsx` offered OSM + Satélite (Esri) layers. NEW `components/interactive-map.tsx` L119-122: single CARTO `dark_all` tile layer, no switcher.
3. **Street View "Ver RA" per meeting point** — The closure restores the action in `components/interactive-map.tsx` with the official `api=1&map_action=pano&viewpoint=...` Maps URL. Satellite/layer switching remains out of scope.
4. **Security-tier marker colors** — ORIGINAL markers: green (disponible), red (LLENO), yellow (seguridad ≤ 2), blue (seguridad ≥ 5). NEW L183/L230-235: only available/full. (`seguridad_nivel` still shown numerically in the list, but the map no longer encodes it.)
5. **Full marker popup with coordinates + actions** — ORIGINAL popups showed capacidad/estado/tiempo a pie/seguridad/coordenadas with two actions. NEW: tooltip + selection pan; coordinates are no longer displayed anywhere in the UI.
6. **Community auto-categorization** — ORIGINAL `getTipoMensaje` keyword matching labeled each post Alerta/Seguro/Info. NEW `components/community-panel.tsx`: static "Comunitario" badge only.
7. **Image attachments in community posts** — DISMISSED. The current panel has the file input, 2 MB validation, preview and `composeMessageWithImage`/`parseMessageMedia`; the earlier parity note was incorrect.
8. **Image attachments in 1:1 chat** — DISMISSED. The current chat has file input, validation, preview and rendered image support; the earlier parity note was incorrect.

Minor / debug / cosmetic losses:

9. **Chat "Reset" debug button + wifi indicator** — ORIGINAL chat footer affordances (demo read-only mode). Gone in NEW; no replacement (developer affordance, not user-value).
10. **Map scale control** — ORIGINAL Leaflet scale; NEW map omits it (cosmetic).

Intentional removals (recorded, **not counted** as capability losses):

11. **Unauthenticated admin access** — Full mode still requires `rol ∈ {operator, admin}` + panel flag. Demo mode now has a local-only path for a `user` identity, explicitly marked `Simulación demo`; this restores portfolio demonstrability without changing backend authority.

Dead code in ORIGINAL that carried **no user-facing features** (verified: no importers at 014e7e5 — `app/page.tsx`, `app/layout.tsx` and all components checked):

- `components/volcano-status-banner.tsx` (1075 L) — monitoring params (Sismos 24h, Temperatura Cráter, Emisión SO₂, Deformación), recomendaciones, zona de exclusión text, sound toggle, dev simulation controls: **never imported**. Its concepts partially survived into NEW: exclusion zone → map circle (gain #4), sound/sim controls → `lib/alert-sound.ts` + operator console + emergency modal.
- Toast system (`components/ui/toast.tsx`, `components/ui/toaster.tsx`, `hooks/use-toast.ts`) — no callers, no `<Toaster>` mounted in ORIGINAL layout; `@radix-ui/react-toast` dep was dead. No user-facing loss.
- `hooks/use-mobile.tsx` — no callers; not needed for responsive behavior (Tailwind breakpoints used).
- `pg` dependency in ORIGINAL package.json — no app/api routes exist (tree confirmed), so no user-facing server feature depended on it.

---

## 3. Gains (NEW only)

1. **Real Supabase Auth OTP** — phone → 6-digit code flow with roles; replaces fake SMS delay and localStorage-only session.
2. **Role-gated operator console** — RPC-backed actions (`cambiar_nivel_alerta`, `cambiar_estado_punto_encuentro`, `resetear_puntos_encuentro`), RLS + SECURITY DEFINER, audit trail, confirm dialogs (double confirmation for rojo), moderation UI with author names.
3. **Real unread counts + read receipts** — DB columns `leido`/`fecha_lectura` with mark-read on conversation select; replaces the flat fake "1" badge.
4. **Exclusion zone rendered on the map** — dashed circle sized by `zonas_exclusion.radio_km` per alert level, color-coded by level, legend + description card (`components/interactive-map.tsx` L168-177, L222).
5. **Public volcano status pre-login** — alert badge + status header visible before authentication.
6. **Mute toggle for the alarm sound** — persisted (`vulcania-alert-sound`), respects `prefers-reduced-motion`; ORIGINAL forced continuous sound until dismissal.
7. **Tappable emergency contacts** — 131/132/133 `tel:` links with SENAPRED source attribution + SENAPRED link (`lib/emergency-contacts.ts`).
8. **Theme toggle** — dark/light, persisted, OS-preference fallback (`components/theme-toggle.tsx`).
9. **PII-safe authorship** — `autor_nombre` + `perfiles_publicos` instead of exposing user data in community/chat.
10. **Accessibility** — accessible textual point list (keyboard alternative to the map), legend, focus management in dialogs, reduced-motion handling.
11. **Status transparency** — staleness warning, Fuente/Referencia, simulation badge, "Qué hacer ahora" action card.
12. **Simulation labeling everywhere** — demo vs. real state made explicit (operator console, map, status header).
13. **Higher limits** — community feed 20 → 30, chat limit 500 → 1000 chars, Ctrl/Cmd+Enter submit.
14. **Centralized alert-level config** — `lib/alert-levels.ts` single source of truth (labels, colors, criticality) reused across header, map, modal, console.

---

## 4. Verdict

**The product is net better after closure: R1-R4 are implemented locally, with the live Supabase provision/doctor gate still external.**

Remaining intentional losses are concentrated in map presentation (satellite, security-tier colors, popup detail and scale) plus the heuristic sentiment badge and a debug reset affordance. Images, browser notifications, Street View and demo emergency access are preserved/restored. R1 still requires applying `scripts/init.sql` to the target Supabase project and obtaining a green live `pnpm doctor`/Realtime smoke before deploy.


## 5. Closure evidence (2026-08-16)

- R1: `AlertProvider` now performs a bounded 30 s safety refresh, exposes Realtime status and preserves the last alert on query failure; `init.sql` adds an idempotent publication health RPC and `doctor` fails with a rerun instruction when any of four tables is missing.
- R2: `lib/browser-notifications.ts` and `NotificationToggle` restore both callers with explicit permission, hidden-tab gating and tests; no prompt is requested at mount.
- R3: demo-only operator access lets a demo `user` open the local console and set the simulated alert; full mode still requires operator/admin.
- R4: map restores `Ver RA` through Google Maps URL `api=1&map_action=pano&viewpoint=...`; login restores the 9 tip and shell restores `Bienvenido`.
- The prior claim that chat/community images disappeared was false and is explicitly dismissed here; current code and tests cover the 2 MB image path.
