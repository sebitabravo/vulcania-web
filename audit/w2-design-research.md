# W2 — Design Research & UX Audit — Vulcania Web

**Scope:** Part 1 web research of emergency-alert benchmarks + Part 2 read-only design/a11y/UX audit of the frontend whitelist (12 files). No code was modified.
**Method:** WebFetch of pre-curated URLs (2 fetched successfully, 3 blocked at host level — marked below). Code audit by full-file read + targeted grep verification (`aria-*` → 0 matches in `app/` + `components/`; `.dark|prefers-color-scheme|prefers-reduced-motion` → 0 matches; `next/font` → 0 matches). Findings deduplicated; line numbers cite current `main`.

---

## 1. Research findings per benchmark

### 1.1 USGS Volcano Hazards Program — `https://www.usgs.gov/programs/VHP/volcano-updates` (fetch verified)

What USGS does that matters for Vulcania:

- **Dual parallel scales, always paired.** Every volcano entry carries both an Alert Level (NORMAL / ADVISORY / WATCH / UNASSIGNED) and an Aviation Color Code (GREEN / YELLOW / ORANGE / RED), rendered as a combined slug — e.g. "AVO Great Sitkin **ORANGE/WATCH**". The pairing is the information architecture: one status line, two coordinated semantics (community risk + aviation). Vulcania has a parallel situation in Chile (SENAPRED tricolor vs SERNAGEOMIN 4-level) and currently renders only one flat label.
- **UNASSIGNED exists.** Monitoring gaps get their own explicit state rather than being silently omitted — an honest "no data" state.
- **Rigid banner anatomy** (highly reusable): bold volcano name → "Alert Level = ADVISORY / Aviation Color Code = YELLOW" → "As of <timestamp UTC>" → bold status slug + one-line plain-language summary → change-history line → link to full update. Every banner answers: *which volcano, what level, since when, what changed, where to read more*.
- **The text feed works without the map.** Updates are a scrollable text list with timestamps; the map is optional. Text-first is the accessibility floor for a monitoring surface.
- **Empty states are calm and explicit**: "Current Volcano Alert Level: all NORMAL", "No signs of unrest…" — absence of alert is a *stated* state, never a blank surface.
- **All-caps section markers** (SUMMARY:, ACTIVITY UPDATE:) + dual timestamps (local + UTC) + **named human contacts** on each update.

### 1.2 SENAPRED — `https://www.senapred.gob.cl` (fetch verified; homepage only)

- **Imperative household action verbs**: "Prepárate para la temporada de invierno", "Prepara tu Kit de Emergencia para Mascotas", 8-step family plan ("Conoce los 8 pasos para organizar a tu familia"). Official Chilean emergency vocabulary is *imperative + concrete object*, not abstract status language.
- **Temporal triage**: content organized "antes, durante y después de una emergencia" — the user is always told which phase they are in.
- **Dedicated alerts surface** ("Sismos / Alertas") separate from general news — alert content never competes with marketing content.
- **es-CL timestamps**: "13 de Agosto de 2026 17:30" — locale-correct datetime formatting is an accessibility feature, not decoration.

### 1.3 Global Volcanism Program — `https://volcano.si.edu` — **FETCH FAILED (HTTP 403, 2 attempts)**

Findings below rely on the orchestrator research baseline, not a live fetch; treat as unverified conventions:

- Weekly bulletin culture: volcano activity reported in periodic digests (WOVOdat/Weekly Volcanic Activity Report) rather than real-time alert feeds.
- Stronger on eruption *history* and *activity taxonomy* than on civil-protection alerting; less relevant to Vulcania's alert-banner surface.

**Vulcania adoption:** none directly from GVP beyond "cite the source institution on every data point" (Vulcania already attributes "SERNAGEOMIN - OVDAS" — but see audit finding on fabricated attribution).

### 1.4 Sernageomin — `https://www.sernageomin.cl` — **FETCH FAILED (TLS certificate verification, 2 attempts)**

Unverified baseline (orchestrator-provided):

- Chile's **official 4-level volcanic alert scale** (RNVV/OVDAS): Verde → Amarilla → Naranja → Roja, with official terminology "Alerta Verde/Amarilla/Naranja/Roja" and graded report cadence (RAV/REAV/Flash reports, frequency per level).
- This is the scale Vulcania's code already implements (4 levels: verde/amarillo/naranja/rojo) — the correct institutional choice, but the app renames levels to NORMAL/PRECAUCIÓN/ALERTA/EMERGENCIA (see finding P1-D), which diverges from official vocabulary and from SENAPRED's *"Alerta Amarilla"* which means something different (SENAPRED = civil-protection tricolor; SERNAGEOMIN = volcano technical scale).

### 1.5 Ready.gov — `https://www.ready.gov` — **FETCH FAILED (HTTP 403, 2 attempts)**

Unverified baseline (orchestrator-provided) — emergency UI best practices Vulcania should adopt:

- **Color is never the only channel** (WCAG 1.4.1): alert levels = color + icon + text label together.
- **Plain language over field names**; large buttons, minimal clicks under stress (two-tap core action).
- **Bottom nav > hamburger** for mobile emergency apps (measurably less confusion).
- **"No active alerts" is a designed empty state**, not an empty page.
- **Dark theme suits 24/7 monitoring ops**; respect `prefers-reduced-motion` — the calmest surface is the most trustworthy in a crisis.

### 1.6 Synthesis — what Vulcania should adopt (ranked)

1. **Banner anatomy from USGS**: volcano name → level badge (color+icon+label) → freshness timestamp → one-line plain-language summary → change history. Vulcania's header has the parts; the banner modal does not.
2. **Explicit calm empty states** ("Sin alertas activas — monitoreo normal", USGS "all NORMAL" pattern) on banner, map and community surfaces.
3. **Text-first alternative to the map** (USGS feed pattern): a list of points/volcanoes with level badges, for SR/keyboard users and low-bandwidth contexts.
4. **Dual-scale literacy**: Vulcania's canonical scale is SERNAGEOMIN 4-level (matches code); the UI should label it *"Alerta Naranja (SERNAGEOMIN)"* and translate to SENAPRED phrasing ("Preparación/Emergencia") only when speaking to civil-protection actions — never mix the two vocabularies in one badge.
5. **Imperative es-CL copy** (SENAPRED): "Revisa tu plan de evacuación", not "Información de seguridad disponible".
6. **es-CL timestamps everywhere** ("Actualizado hace 5 min", full date format in detail views).
7. **Timestamps must carry the source clock** (UTC or "Hora local Chile") — USGS dual-timestamp pattern.

---

## 2. Code audit findings

**Verification notes (grep, read-only):** `aria-*` → 0 matches in all `.tsx` under `app/` + `components/`. `\.dark|prefers-color-scheme|prefers-reduced-motion` → 0 matches. `next/font` → 0 matches; only `font-sans` fallback at `app/layout.tsx:25`. `components/map-component.tsx` (12 lines) is a wrapper re-exporting the whitelisted `interactive-map.tsx` — all map findings point at the real implementation.

### P0 — blocking

- **[P0][ux] `components/emergency-modal.tsx:350-351` — Emergency phone numbers are wrong: "llama al 133 (Bomberos) o 131 (Carabineros)" — Chilean standard is 131 = SAMU/ambulancia, 132 = Bomberos, 133 = Carabineros; the labels for 133/131 are swapped and SAMU is missing. Impact: the single most stress-critical string in the app misdirects users — dangerous misinformation in a crisis. Recommendation: correct to 131 SAMU / 132 Bomberos / 133 Carabineros and re-verify against an official source (SENAPRED) before shipping; keep numbers in a single config source, never inline.**
- **[P0][a11y] `components/volcano-status-banner.tsx:991-1072` + `components/emergency-modal.tsx:260-356` — Critical alert overlays are bare `<div>`s (`fixed inset-0 bg-black/90 z-50`): no `role="alertdialog"`, no `aria-modal`, no `aria-labelledby`/`aria-describedby`, no focus trap, no Escape handling, no initial focus. Combined with zero `aria-*` anywhere in the app (grep verified), the single most important event in the product is invisible to screen readers. Recommendation: modal semantics + focus management (or Radix Dialog with `modal` + `onOpenAutoFocus`), and announce level changes via a polite live region on the banner.**

### P1 — high

- **[P1][ux] `components/emergency-modal.tsx:79` — Comment states the sound "el sonido SIEMPRE debe sonar" and it auto-plays on alert with no mute control inside the modal and no consent/persistence. Impact: involuntary audio in a stress moment; no way out; also a UX-consent failure. Recommendation: sound ON by default for critical levels is defensible, but must be user-disarmable per alert, persist the preference, and never loop two sounds from two modals simultaneously (see P1-B).**
- **[P1][ux] Duplicate emergency overlays — `components/emergency-modal.tsx:215` (global, polls every 5s) and `components/volcano-status-banner.tsx:991` fire on the same naranja/rojo trigger: two stacked full-screen overlays, two audio loops on different intervals. Impact: overlapping audio + double modal under stress. Recommendation: single source of truth for the emergency overlay (one component, one audio loop).**
- **[P1][a11y] `components/interactive-map.tsx:464-589` — Raw HTML popups with inline styles, emoji icons (👥📊🚶🛡️), inline `onclick="window.open(...)"` (L523-558) and `onmouseover` JS — non-semantic `<div>` "buttons", keyboard-inaccessible, and DB values (punto.nombre, direccion) interpolated into HTML strings = stored-XSS-adjacent pattern. Impact: popups unusable by keyboard/SR; injection risk if any source data becomes user-editable. Recommendation: React-rendered popups (`react-leaflet`/`Popup`) with real `<button>`s.**
- **[P1][ux] `components/interactive-map.tsx:551` — Broken glyph in the "Navegar" button label ("� Navegar") renders a replacement character in production. Impact: visible corruption in a core action. Recommendation: fix encoding/typo; the button belongs in a React popup anyway (P1-C).**
- **[P1][a11y] `components/interactive-map.tsx:41` + `app/globals.css:57-60` — `background: #1f2937 !important` on `.leaflet-container` and `color: #1f2937 !important` on popup content: the map is locked to a dark-gray scheme and popup text is forced dark regardless of theme. Impact: unthemeable, breaks light mode (planned in section 3), inconsistent with tokens. Recommendation: remove `!important`, style map chrome through tokens.**
- **[P1][design] Four independent alert-level color systems — `components/volcano-status-header.tsx:17-60` (`getNivelConfig`), `components/volcano-status-banner.tsx` (level config read from DB `configuracion.color`), `components/admin-panel.tsx:33-62` (`niveles` with `bg-*-600`), `components/interactive-map.tsx:426-436` (hardcoded hex `#22c55e`/`#ef4444`/`#f59e0b`/`#3b82f6`). Same 4-level scale, four implementations, divergent tokens. Impact: level colors will drift; a "rojo" can look different on banner vs map vs admin. Recommendation: one design-token source (level → color/icon/label/text mapping); DB stores the *semantic key* ("rojo"), never a Tailwind class or hex.**
- **[P1][design] App-invented level labels — admin-panel.tsx:33-62 / volcano-status-header.tsx:25-49 map SERNAGEOMIN's official "Alerta Verde/Amarilla/Naranja/Roja" to invented NORMAL/PRECAUCIÓN/ALERTA/EMERGENCIA. Impact: confuses users who know the official scale; "ALERTA" collides with SENAPRED's "Alerta Amarilla" civil-protection meaning. Recommendation: use official SERNAGEOMIN level names, with SENAPRED phrasing only in the guidance layer.**
- **[P1][ux] Fabricated emergency data in the production bundle — `components/volcano-status-banner.tsx:165-239` (hardcoded `emergencyData`, incl. rojo "ERUPCIÓN INMINENTE" copy), `components/emergency-modal.tsx:125-145` (`forceEmergency` test trigger), `components/admin-panel.tsx:328-361` (`Math.random()`-generated "sensor" parameters). Dev buttons are gated by `NODE_ENV` but data+logic compile into prod. Impact: any mis-trigger path shows fabricated emergency state in a real monitoring app; also violates the no-fabricated-data design rule. Recommendation: move all demo/fake material to a dev-only module or feature flag at build time.**
- **[P1][a11y] `components/chat-component.tsx:530` — Conversation selection is a `<Card onClick>` (div): no `role`, no `tabIndex`, no keyboard activation. Impact: keyboard users cannot open a conversation. Recommendation: `<button>` semantics (or `role="button"` + Enter/Space + focus styles); the same applies to any other clickable cards.**
- **[P1][a11y] Map markers are color-only and unfocusable — `components/interactive-map.tsx:324` (volcano dot, hardcoded `#ef4444`), `:426-436` (meeting-point marker colors). No legend, no icon/text on markers, Leaflet markers not in tab order. Impact: WCAG 1.4.1 failure — colorblind users cannot read the map; SR/keyboard users get nothing. Recommendation: marker = shape/icon + label + aria-label (volcano name + level), tabindex focus, and a text list alternative below the map (USGS pattern, 1.6-3).**
- **[P1][design] `app/globals.css:7-27` — Pure black background (`--background: 0 0% 0%`) and pure red accent (`--accent: 0 100% 50%`, duplicated into `--destructive`/`--ring`). Impact: pure black is a poor 24/7 surface (halation, no depth cues); pure red at max chroma fails 4.5:1 for small text on it and gives no headroom. Recommendation: tinted dark neutrals + alert scale tokens (section 3), single accent with chroma < 80%.**

### P2 — medium

- **[P2][a11y] `app/globals.css:56-83` — `!important` z-index escalation: `[role="dialog"]`/`[data-radix-dialog-content]` → 9999, overlay → 9998, popper → 9999, `.leaflet-container` → 1. Impact: emergency modals (z-50) can stack under Radix dialogs; Leaflet z forcing breaks its own pane model. Recommendation: one tokenized z-layer scale, no `!important`.**
- **[P2][a11y] No reduced-motion support anywhere (grep: 0 matches) — worst case `components/volcano-status-banner.tsx:992` `animate-pulse` on the whole critical modal + `animate-bounce` icon (`app/globals.css:119-141` redefines bounce manually), `emergency-modal.tsx:261` pulsing border. Impact: the highest-stakes screen animates perpetually — vestibular/photosensitive risk. Recommendation: motion only on escalation (one-time), `prefers-reduced-motion: reduce` → static high-contrast variant. Bounce easing is banned (taste-design).**
- **[P2][design] Dead theming infrastructure — `tailwind.config.ts:5` `darkMode: ["class"]` but no `.dark` block exists (grep 0 matches); `:root` already holds dark values. Impact: permanently dark app with no light path and no token structure for one; `chart-1..5`/`sidebar-*` config references CSS vars undefined in globals.css (silent break if used). Recommendation: `:root` = light, `.dark` = current dark, class toggle + `prefers-color-scheme` default (section 3).**
- **[P2][design] Three competing accents — `app/page.tsx:88-106`: tabs colored red-600 (Mapa) / blue-600 (Comunidad) / green-600 (Chat). Impact: three accents + green (alert-normal color) for a chat tab dilutes the alert color language; WCAG 1.4.1 semantic consistency. Recommendation: single neutral accent for nav; reserve green/yellow/orange/red exclusively for alert levels.**
- **[P2][design] Brand inconsistency — `app/layout.tsx:8` "VULCANIA - Demo" vs `app/page.tsx:58-60` and `components/login-screen.tsx` "VOLCANO EMERGENCIA". Impact: two brand names in one product; "EMERGENCIA" in the brand name desensitizes the word. Recommendation: one brand; name the product, keep "emergencia" for alerts only.**
- **[P2][a11y] Sub-44px icon-only controls without labels — `components/chat-component.tsx:723-737` and `components/community-panel.tsx:346-361`: upload triggers are `h-9 w-9` (36px) icon-only labels with no `aria-label`; admin delete button icon-only (Trash2). Impact: touch target fails WCAG 2.2 2.5.8 (44px), unlabeled for SR. Recommendation: 44px min + `aria-label`.**
- **[P2][a11y] Contrast failure on metadata text — `text-gray-500` (`#6b7280`) on `gray-900`: ratio ≈ 3.7:1, fails 4.5:1 for small text. Used for timestamps (`chat-component.tsx:680`), community metadata (`community-panel.tsx:431`), empty-state copy. Recommendation: raise to gray-400 or tokenize a `muted-foreground` ≥ 4.5:1.**
- **[P2][ux] `components/admin-panel.tsx:236-264` — "Resetear Todos" runs a bulk update with an always-true `gte("capacidad", 0)` condition and no confirmation (unlike the delete flow at :159). Impact: one tap wipes occupancy state of every meeting point. Recommendation: confirmation with blast-radius wording; scope condition must be intentional.**
- **[P2][ux] Native blocking dialogs — `components/admin-panel.tsx:159,319` `window.confirm`/`alert`, `components/community-panel.tsx:175` `alert("Error: Tu usuario no existe…")`. Impact: blocking, unstyled, unlocalizable, SR-hostile. Recommendation: in-app toast/dialog components.**
- **[P2][ux] `components/community-panel.tsx:266-283` — Keyword heuristic (`getTipoMensaje`: peligro/emergencia/evacuación → warning; seguro/tranquilo/bien → safe) misclassifies ("no está bien" → safe; "hay peligro? no" → warning). Impact: wrong badges under stress undermine trust. Recommendation: explicit self-tagging or moderation, not substring matching.**
- **[P2][design] No map legend and no map empty state — `components/interactive-map.tsx:708-809`: markers render with no legend; zero points loaded → blank map, no guidance. Impact: color-only semantics unreadable; empty state anxiety. Recommendation: legend (icon+color+label), "Sin puntos registrados — sé el primero en registrar uno" empty state.**
- **[P2][design] Fabricated institutional attribution — `components/volcano-status-banner.tsx:715` hardcodes "SERNAGEOMIN - OVDAS" as data source while the data is local/demo. Impact: false authority; trust damage if exposed. Recommendation: show the true source; show "Datos de demostración" badge in demo mode.**
- **[P2][ux] `components/login-screen.tsx:159-160` — Debug text leaks to users: "Actual: {telefono} ({telefono.length} chars)". Impact: developer artifact in a public flow. Recommendation: delete; keep only validation messages.**
- **[P2][design] Emoji-as-icon across all surfaces — 🚨/⚠️ headers (`emergency-modal.tsx:273-275`), 📍/🔊/💡/🚀/🔄 (`interactive-map.tsx:473-493`, `volcano-status-banner.tsx:1054`, `admin-panel.tsx:632-659`, `login-screen.tsx:216`, `chat-component.tsx:507-514`). Impact: platform-varying glyphs, SR-hostile, unprofessional. Recommendation: lucide icons only; emoji banned.**
- **[P2][ux] Dev/test controls in the visible UI — `components/chat-component.tsx:507-514` ("🔄 Reset" exposed in the chat UI), `volcano-status-banner.tsx:915-986` (level simulator + "🚨 ACTIVAR EMERGENCIA AHORA" buttons render in dev mode above the fold). Recommendation: gate behind the same NODE_ENV flag, out of the component tree, or a separate dev page.**

### P3 — low

- **[P3][design] `app/layout.tsx:25` — No `next/font`: body falls back to the system UI stack; no display face, no tabular numerics for telemetry. Recommendation: self-hosted font pair (section 3) with `font-display: swap`.**
- **[P3][ux] `app/layout.tsx:11` — `generator: "v0.dev"` metadata ships to production. Impact: tooling fingerprint; no user value. Recommendation: remove.**
- **[P3][a11y] `components/chat-component.tsx:744` — deprecated `onKeyPress`; Enter-send also fires while IME composing (Spanish input). Recommendation: `onKeyDown` + `event.nativeEvent.isComposing` guard.**
- **[P3][design] `app/globals.css:119-141` — Manually redefines Tailwind's `animate-bounce`/`animate-pulse` keyframes, colliding with the framework utility names. Recommendation: delete; use framework utilities, then ban bounce per motion rules.**
- **[P3][ux] `app/page.tsx:36` — Loading spinner hardcoded `border-2 border-red-500`: red (alert color) used for a neutral loading state. Recommendation: neutral token.**
- **[P3][a11y] `app/globals.css:53` — Only `:focus-visible` rule is `ring-red-500`; Leaflet controls and raw popup buttons have no focus styles. Recommendation: global focus ring token; extend to map controls.**
- **[P3][ux] `components/login-screen.tsx:15,44` — Phone prefix rewritten by `onFocus`/`onBlur` (jerky on mobile keyboards) and `setError("")` duplicated. Recommendation: format on submit only; drop the duplicated call.**
- **[P3][design] `components.json` baseColor "neutral" vs actual pure-black/white tokens — mismatch between scaffold and reality; rerun shadcn init tokens when section 3 lands.**

---

## 3. Design direction — "Centro de Monitoreo Volcánico"

**Moodboard:** the inside of an OVDAS monitoring room at night. Calm, dense, precise, dark. The product should feel like *instrumentation you trust*, not a consumer app — and the only moment it raises its voice is when the volcano does. **Design variance dial: 4/10** — restrained by domain (emergency credibility > novelty), elevated by typography and data typography rather than decoration.

**Visual language**

- Dark-tinted surfaces (no pure black): background `#0b0f14`, surfaces `#11161d`/`#161d26`, borders `#1f2833`. Every neutral carries a cold hint of the slate-blue brand hue (OKLCH `0.9% 0.015 250`).
- Density: cockpit-grade for data (map, level readouts), generous whitespace for guidance copy (alert modal, empty states). No nested cards deeper than one level; use dividers and whitespace.
- Single brand accent (OKLCH `0.6 0.12 250`, a steel blue) used only for navigation/interaction — never for status.
- The four alert levels are the only saturated colors in the app, used for one job only: verde `oklch(0.72 0.19 150)` / amarillo `oklch(0.85 0.16 90)` / naranja `oklch(0.68 0.19 45)` / rojo `oklch(0.55 0.21 27)`. Level = **color + icon + text label + pattern** (rojo/naranja get a diagonal stripe pattern on banners) so WCAG 1.4.1 holds even for the four-color-ambiguous pair naranja/rojo.

**Alert-scale strategy (the dual Chilean scales)**

- Canonical scale = **SERNAGEOMIN 4-level** (Verde/Amarilla/Naranja/Roja — matches the code and the institution). Badge reads "Alerta Naranja", small mono subscript "SERNAGEOMIN".
- SENAPRED tricolor enters only as *action guidance*: when level ≥ Naranja, the guidance block speaks civil-protection language ("Preparación", "Evacuación preventiva") with SENAPRED phrasing. Never render both scales as simultaneous badges — one canonical scale, one translation layer. (Open question OQ-1.)
- Levels carry official vocabulary only: NORMAL is "Verde" in banner copy, not a badge rename.

**Typography pairing**

- Display/headings: **Space Grotesk** (technical, confident, es-CL friendly) for volcano names, level badges, section titles.
- Body: **IBM Plex Sans** (large x-height, humanist legibility under stress, full Spanish glyphs) for guidance copy, 16px min, line-height 1.6.
- Data: **IBM Plex Mono** with `tnum` for telemetry (sismos, gas, temperature readouts), freshness timestamps, coordinates — the cockpit language that separates *facts* from *guidance*.
- Scale: minor third (1.25) — data-dense monitoring UI. Alert modal copy ≥ 18px. Both fonts self-hosted via `next/font`, `font-display: swap`. No Inter (banned).

**Status banner anatomy (USGS-derived)**

Name + level badge (color+icon+label+pattern) + "Actualizado hace Xm (HH:MM hora local Chile)" + one-line plain-language summary + expandable "Ver detalle" + source line. Change history shown as a small delta ("Nivel anterior: Amarilla"). Calm state: same banner in Verde reading "Monitoreo normal — sin anomalías".

**Map styling**

- Dark basemap by default (CartoDB dark_matter) with the token surface palette; the map is *chrome*, the markers are the content.
- Volcano marker: level-colored triangle with white icon + label chip on hover/focus (marker carries `aria-label` "Volcán X — Alerta Naranja"). Meeting-point markers: square shape with icon (shape+color+label so points never read as volcano levels), h-10 w-10 (40px min, ideally 44).
- Legend always visible, collapsed on small screens: color+icon+text per level and per point type.
- Text list alternative under the map (USGS 1.6-3): "Puntos cercanos" list with badges — the keyboard/SR path.
- Popups: React-rendered, real buttons ("Navegar", "Ver ruta"), no emoji, no inline JS, no broken glyphs.
- Empty map state: "Sin puntos registrados — registra el primero" with illustration-less typographic calm.

**Motion principles**

- Functional only: guide attention (level change), show relationship (marker ring), give feedback (button press). Nothing decorative.
- Micro-interactions 150-200ms, standard ease `cubic-bezier(0.4, 0, 0.2, 1)`; escalation (level up) is the only emphasized motion: banner shifts color 200ms, modal enters 300ms `cubic-bezier(0.22, 1, 0.36, 1)` with a single one-shot pulsing ring on the level badge — no perpetual pulse/bounce (both banned).
- List stagger 60ms per child, index-multiplied.
- Everything via `gsap.matchMedia()` with a `prefers-reduced-motion: reduce` branch → static, high-contrast escalation (no animation, sound off by default).
- Sound: alert chirp ON by default only for naranja/rojo, mute control inside the modal, persisted preference. Never two audio loops.

**Light/dark plan**

- Token architecture: `:root` = light (daylight field use — lower saturation versions of the same hues), `.dark` = current dark scheme; `darkMode: ["class"]` stays, plus `prefers-color-scheme` default and a manual toggle persisted in the DB/`localStorage`.
- Dark is the primary face (24/7 ops); light is the secondary (sun-readable) face. Both tinted neutrals; text `#f0f4f8`-family in dark, `#10151c` in light. Map basemap follows the theme.

**Empty states and copy**

- Banner: "Monitoreo normal — sin alertas activas" (Verde). Map: see above. Community: "Aún no hay reportes — comparte el primer avistamiento". Chat: "Sin mensajes — inicia la conversación".
- Copy voice (SENAPRED-derived): imperative, concrete, es-CL: "Revisa tu plan de evacuación", "Conoce las 8 señales". Errors: what happened + how to fix. Placeholders are examples, never labels.

---

## 4. Out of scope — one-liners

- `components/volcano-status-header.tsx` and `components/map-component.tsx` were outside the whitelist; only their token duplication was flagged (P1-D). A full audit of both remains.
- Real-time/DB layer, Supabase schema, demo-data lib (`lib/demo-data.ts`), logger lib — not audited for design.
- Auth/SMS login flow business logic (only its UI leak was flagged, P2-I).
- Backend/source integration with Sernageomin OVDAS data (design assumes real data; see P1-G).
- Visual verification: no build/run performed (read-only audit); findings are static.
- Leaflet → react-leaflet migration decision belongs to the architecture track (W1).

## Open questions

- **OQ-1 (canonical scale):** confirm SERNAGEOMIN 4-level as the single canonical badge scale, with SENAPRED phrasing only in guidance. This drives every token and copy decision in section 3.
- **OQ-2 (emergency numbers):** re-verify 131/132/133 against an official source (SENAPRED) before shipping — the current strings are swapped (P0-A).
- **OQ-3 (sound policy):** should sound auto-play on naranja/rojo, or require one explicit permission after the first login? Product decision needed for P1-A.
- **OQ-4 (brand):** VULCANIA vs "VOLCANO EMERGENCIA" — one name, then tokenize it (P2-C).
- **OQ-5 (demo vs real):** does production ship with real OVDAS data soon, or with demo data behind a visible badge? P1-G and P2-L depend on the answer.
- **OQ-6 (admin generator):** keep the `Math.random()` parameter generator behind an explicit demo flag, or remove it (P1-G)?
