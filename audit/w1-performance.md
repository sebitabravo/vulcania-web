# Audit W1 — Performance (static, read-only)

**Method**: no `pnpm build` / Lighthouse allowed (write scope). Findings are static reasoning; numbers are ranges to validate with a build + Lighthouse after fixes. All paths relative to repo root.

**Verified project shape**: Next.js 15.5 App Router, React 19, pnpm 10.10, Vercel. Single route: `app/page.tsx` is `"use client"` and renders the entire tree (login gate → tabs mapa/comunidad/chat + admin panel). `app/layout.tsx` is a server component that mounts client `AuthProvider` + `EmergencyModal`. There are no server components producing content, no route groups, no API routes (all data is client-side to Supabase).

**Corrections to prior known findings**:
- `components/volcano-status-banner.tsx` (1075 L) is **not imported anywhere** (git grep: zero references outside its own file). It is dead code, not a re-render cost. The live banner is `components/volcano-status-header.tsx` (out of whitelist, same file family — apply banner fixes there).
- `interactive-map.tsx` (825 L) IS live, via `map-component.tsx` → `app/page.tsx:12`.
- Leaflet itself IS isolated at runtime: `import type * as L from "leaflet"` (interactive-map.tsx:5) is type-only/erased, and the lib loads via runtime `import("leaflet")` (lines 202, 385). The code-split claim is about the component, not Leaflet (finding 3).

**Static baseline estimate (vs Core Web Vitals: LCP < 2.5s, TBT < 200ms, CLS < 0.1)**:

| Metric | Est. today | Main drivers | Est. after top fixes |
|---|---|---|---|
| LCP | 3.5–6s (mid mobile, 4x CPU) | Client-only render; ~200–280KB gz initial JS (all tabs + `@supabase/supabase-js` ~25–35KB gz + lucide + Radix); banner paints after N serial queries; map tab needs Leaflet CSS from unpkg | < 2.5s if shell is server-rendered + tabs split + banner in 1 query |
| TBT | 300–600ms | Parse/exec of monolith bundle; tab-switch remount/refetch storms; AudioContext per beep; N+1 chat | < 200ms with bundle split + query cache |
| CLS | Likely OK (< 0.1) | Fixed 400px map container, skeleton placeholders, spinners reserve space. Risk is visual pop (tiles/markers) when Leaflet CSS lands late, not layout shift | Stays OK; preload/bundle Leaflet CSS |

---

## Findings (impact order)

### 1. `[P1][bundle/ssr] app/page.tsx:1-15, 110-121 — monolithic client bundle: every tab, admin panel, and supabase-js ship on first load`
Whole app is client-rendered (`"use client"`); `page.tsx` statically imports MapComponent, CommunityPanel, ChatComponent, AdminPanel, VolcanoStatusHeader, LoginScreen — none are code-split. Radix `TabsContent` unmounts inactive tabs (good for memory) but their JS is already downloaded and parsed. `@supabase/supabase-js` enters the initial bundle through `auth-context.tsx:6` (mounted in `layout.tsx:26`), i.e. even a logged-out visitor who only sees LoginScreen pays ~25–35KB gz for the Supabase client. No server-rendered content means LCP = JS download + parse + hydrate + first fetch chain.
**Impact**: LCP and TBT over budget; every navigation to the app pays full cost regardless of tab.
**Fix**: (a) split tabs with `dynamic(() => import("..."), { ssr: false })` from `page.tsx` (works from client components — real `import()` creates chunks); (b) lazy-create the Supabase client on first use instead of module-load `createClient` (`lib/supabase.ts:30-32`) so auth-gate users never download it; (c) consider making the login gate and header server-rendered content (SSR the shell, keep tabs client).

### 2. `[P0][realtime/audio] components/emergency-modal.tsx:148-221 + 21-74 — redundant 5s REST poll + new AudioContext per beep; three overlapping alert mechanisms`
`EmergencyModal` (mounted globally in `layout.tsx:29`) polls `alertas_volcan` via REST every 5 seconds for the app's whole lifetime, while the live banner subscribes to the same table via realtime postgres_changes (two mechanisms double-fetch the same data; a third, `volcano-status-banner.tsx`'s realtime, is dead code). The poll interval is torn down and re-created on every dep change (line 221), including when the sound interval starts. Separately, `createAlertSound` (21-74) constructs a **new `AudioContext` per beep** — the repeating loop (108-119) creates one every 3–4s while an alert is active. AudioContext creation is tens of ms of main-thread work and browsers cap live contexts (~6 in Chrome) — exhaustion silences subsequent alerts.
**Impact**: TBT/INP spikes and battery drain on low-end devices during a red alert — exactly when the UI must respond; REST polling every 5s forever adds request load. Risk of alert sound silently failing at the worst moment.
**Fix**: subscribe once (realtime) and drop the poll, or keep the poll with a 30s floor and skip while a channel is SUBSCRIBED; one shared `AudioContext` created inside the existing user-gesture unlock (`setupAudioUnlock`, page.tsx:21-23) and reused for all oscillators.

### 3. `[P1][bundle/lcp] components/interactive-map.tsx:813-823 — dynamic() with Promise.resolve does not code-split; Leaflet CSS fetched from unpkg at runtime`
`dynamic(() => Promise.resolve(InteractiveMapClient), { ssr: false })` creates no split point — the 825-line component is defined in the same module, statically imported via `map-component.tsx`, so it stays in the main bundle. `ssr: false` only defers mounting (spinner until hydration). Separately, lines 29-91 inject Leaflet CSS from `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` via runtime `<link>` (third-party DNS/TLS + request after first paint), deleting any prior `link[href*="leaflet"]` (line 32-33), with inline critical styles inserted first — tiles/markers pop in late (visual jank on the default tab).
**Impact**: LCP on the default "Mapa" tab is bound by hydration + third-party CSS round trip; FOUC of tiles/markers; unpkg is a reliability/availability dependency for an emergency UI.
**Fix**: extract `InteractiveMapClient` to its own module and use `dynamic(() => import("@/components/interactive-map-client"), { ssr: false, loading })` (real chunk split); import `leaflet/dist/leaflet.css` in that module (bundled, no third-party request) or self-host in `/public` with `<link rel="preload">`; stop removing existing links.

### 4. `[P1][network/data] components/volcano-status-banner.tsx:302-413 — 7 sequential awaited Supabase queries for the banner`
`cargarDatosVolcan` awaits 7 chained queries (alerta → parametros → configuracion → recomendaciones → zona_exclusion → acciones_requeridas → informacion_volcan), each a full REST round trip; the banner above the fold shows a pulse skeleton meanwhile. This file is dead today, but the live `volcano-status-header.tsx` is the same family (verified: same imports + relative-time helper at header:63-64) — apply the fix there.
**Impact**: banner paint delayed by the sum of 7 latencies (est. +1–3s on Vercel-hosted Supabase); TBT/INP while queries run.
**Fix**: single query with FK joins (chat already uses this: chat-component.tsx:228-232 `select(*, emisor:emisor_id(...))`), or `Promise.all` over the independent lookups; cache the result (TanStack Query with `staleTime` 30–60s) so realtime updates and tab remounts don't refetch serially.

### 5. `[P2][data] components/chat-component.tsx:100-187 — N+1 conversation stats + full refetch on every incoming message`
`recargarConversaciones` issues 1 query for all users + 1 query per user for the last message (U+1 requests), and the global realtime subscription (337-388) calls it on **every** INSERT to `mensajes_chat` (line 376) — even messages in other conversations. `conversacionesLeidas` is in the `useCallback` deps (line 187) and in the deps of the message-channel effect (line 334), so marking a conversation read tears down and re-creates the realtime subscription.
**Impact**: network chatter and INP/TBT spikes scale with message volume and user count; subscription churn on every read-toggle.
**Fix**: one lateral-join query or a Postgres RPC returning stats per user; invalidate only the affected conversation on INSERT; remove `conversacionesLeidas` from the subscription effect deps (use a ref).

### 6. `[P2][re-render] app/page.tsx:80,111 — key-remount hacks unmount/remount the whole map and header on any admin change`
`<VolcanoStatusHeader key={status-${refreshKey}}/>` and `<MapComponent key={map-${refreshKey}}/>` force full unmount/remount when `handleAlertChange` fires (admin panel actions, admin-panel.tsx:228,258,317). For the map that means: Leaflet instance destroyed, tiles refetched, 3 `setTimeout(invalidateSize)` timers (interactive-map.tsx:265-278), markers rebuilt — a ~1–2s black flash of the map and a refetch of the entire banner state on every admin toggle.
**Impact**: INP spike and visible flicker on the default tab; defeats the realtime subscription (which would update in place).
**Fix**: lift the changed data into shared state/cache (TanStack Query invalidation) and let components re-render from the cache; remove the keys.

### 7. `[P2][re-render] components/interactive-map.tsx:354-647, 659-695 — marker rebuild churn and per-marker DOM string popups`
The marker effect re-runs on every change of `puntosEncuentro/isClient/loading/mapReady` and re-creates **all** markers each time; `cambiarUbicacion` (659-695) toggles `mapReady` false→true specifically to force marker re-creation on a location switch. Popups are hand-built HTML strings with inline styles (464-590), and each marker effect re-`import("leaflet")` (line 385, cache hit but re-promise). Fine for the 3 demo points; O(n) teardown/rebuild with real data.
**Impact**: INP on location switches; DOM churn proportional to point count.
**Fix**: keep markers in a `L.layerGroup` and diff/update in place; only re-run on actual data change; extract popup content into a `L.popup()` with a shared template.

### 8. `[P2][payload] lib/message-media.ts:29-36 — images sent as base64 data URLs into the database`
`fileToDataUrl` encodes uploads as base64 and `composeMessageWithImage` embeds them in the message row (chat-component.tsx:430, community-panel.tsx:206). Data URLs: +33% size, stored in Postgres rows, shipped in every list refetch, rendered as `<img src="data:...">` with no caching — each render of the avisos list re-parses the whole strings.
**Impact**: DB row bloat, bandwidth and memory on low-end devices; unbounded per image.
**Fix**: upload to Supabase Storage, store the path, render signed URLs; if demo-only, cap file size (e.g. 500KB) before encoding.

### 9. `[P2][deps] package.json:28 + components/interactive-map.tsx:71,214-218 — leaflet "latest" while CSS/icons hardcode unpkg 1.9.4`
`"leaflet": "latest"` is unpinned (lockfile drift across installs), while the CSS and marker-icon URLs are hardcoded to `leaflet@1.9.4` on unpkg. A future `latest` bump desyncs JS from CSS/icons.
**Impact**: latent version-skew bugs; supply-chain hygiene (unpinned).
**Fix**: pin `leaflet` (e.g. `1.9.4`) and self-host the CSS + 3 marker images instead of unpkg URLs.

### 10. `[P2][config] next.config.mjs:9-11 — images.unoptimized: true`
No `next/image` usage anywhere in the app today, so the flag is inert — and arguably correct for an app whose "images" are OSM/Esri tiles (tiles must NOT go through the optimizer). It becomes a trap the moment someone uses `next/image` for user content.
**Impact**: none today; latent.
**Fix**: keep it, but add a comment; if user-generated images later go through `next/image`, remove the flag and configure `remotePatterns` for storage.

### 11. `[P3][fonts] app/layout.tsx:25 — no next/font; font-sans falls back to Tailwind's system stack`
Verified: zero `next/font` references. Today the UI renders the platform system stack — zero network cost, actually a good choice for a dark emergency UI. The cost is only if a brand font is wanted.
**Fix decision**: if branding matters, `next/font/google` with `display: "swap"` self-hosts on Vercel (no third-party request, no layout shift from FOIT); otherwise keep the system stack and remove the ambiguity (it is already what users get).
**Impact**: none today; ±0.1–0.3s LCP only if a swapped font is added carelessly.

### 12. `[P3][correctness] lib/demo-data.ts:3 — module-load new Date()`
`const now = new Date().toISOString()` freezes all demo timestamps at module evaluation (per client session). Relative "Hace X" labels are computed against a fresh `Date()` at render (community-panel.tsx:253-264), so labels will drift negative as a session ages.
**Impact**: negligible perf (one Date call); correctness quirk in demo data.
**Fix**: compute timestamps lazily or derive from a single session start ref.

### 13. `[P3][re-render] hooks/use-toast.ts:176 — listener re-registered on every state change`
`useEffect(() => {...}, [state])` pushes/pops the `setState` listener on every toast dispatch (the effect deps include the state the listener updates). Works, but churns the listeners array on each toast.
**Impact**: negligible (toasts are rare); pattern should be `[]` with functional updates.
**Fix**: `useEffect(..., [])`.

### 14. `[P3][logging] components/interactive-map.tsx:150-178, 390-611 — prod-logging argument evaluation in hot paths`
`logger.debug` is gated by `NEXT_PUBLIC_DEBUG_LOGS` (lib/logger.ts:4), but every call site still evaluates its arguments before the call: per-marker template strings and full object dumps (e.g. line 150-154 builds `{ data: puntos }` on every fetch) allocate even when the flag is off. The map alone has 50 logger call sites.
**Impact**: small allocs per marker/effect in prod; measurable only with many markers.
**Fix**: cheap early-return guard in `logger.debug` (`if (!debugEnabled) return`) — the guard must precede argument construction, so gate at call sites or accept the cost; realistically delete the per-marker logs.

### 15. `[P3][re-render] components/interactive-map.tsx:265-278, 618 — three setTimeout(invalidateSize) + one more after markers`
Layout invalidation at 50/200/500ms after init and again after markers — each triggers tile recalculation and repaint. Belt-and-braces against a sizing bug.
**Impact**: repeated paint work on init; masks the real bug (map container inside a tab).
**Fix**: one `invalidateSize` after mount + a `ResizeObserver` on the container (also fixes tab-show resizing without timers).

---

## Strategy summaries

**Bundle split (route groups + dynamic)**: the app is a single route with tabs, so route groups don't split anything today — the split points are per-tab `dynamic()` imports from `page.tsx` (map/community/chat/admin as separate chunks loaded on first tab activation), plus moving `InteractiveMapClient` to its own module so the map chunk excludes the 825-line component until needed. Lazy-create the Supabase client to drop ~25–35KB gz from the auth-gate path. Target: initial JS ~120–160KB gz, map chunk ~40–60KB, chat+community ~30-50KB.

**Font strategy**: no `next/font` today — system stack, zero cost. If branding is required: `import { IBM_Plex_Sans } from "next/font/google"` (self-hosted on Vercel, `display: "swap"`, subset `latin`) — one request, no CLS from FOIT, no FOIT at all. Decision needed: brand font vs system stack (current).

**Leaflet isolation**: single real dynamic chunk (`import("leaflet")` already splits the lib — keep); bundle `leaflet/dist/leaflet.css` via CSS import in the client module; single map instance for the app lifetime, reused across tab switches (hoist instance in a module-level ref or context); `preferCanvas: true` for marker-heavy data; `L.layerGroup` diffing instead of marker teardown; `ResizeObserver` instead of `invalidateSize` timers; never key-remount the map.

**Data layer**: introduce a query cache (TanStack Query — the natural fit) for the banner, community and chat queries: `staleTime` 30–60s for reference data, realtime inserts invalidate only the affected conversation/table, `key-remount` replaced by `invalidateQueries`. This removes the tab-switch refetch storms (every `TabsContent` remount today refetches and re-subscribes everything: map re-init + chat N+1 + banner serial chain).

## Out of scope (whitelist)
- `components/volcano-status-header.tsx`, `map-component.tsx`, `components/ui/*`, `hooks/use-admin-panel.ts`, `lib/logger.ts`, `lib/audio-unlock.ts`, `lib/browser-notifications.ts`, `lib/phone-utils.ts` — read only via grep; fixes for the banner family must land in the header file.
- No API routes exist; all queries are client-side to Supabase. RLS/authz, tests, and the `pg` dependency (server-side use) not reviewed.

## Open questions
1. Is `components/volcano-status-banner.tsx` (1075 L) dead — delete? Zero references found.
2. What is `NEXT_PUBLIC_DEBUG_LOGS` set to in the Vercel prod env? If `true`, the 50 map logger call sites run hot in prod.
3. Is the production deployment demo mode (`NEXT_PUBLIC_DEMO_MODE=true`, no Supabase env)? Then all realtime/polling code is dead at runtime but still shipped and parsed — bundle savings are bigger than the runtime findings.
4. Real user count for the chat (N+1 severity scales with users) and real row counts for `puntos_encuentro` (marker churn severity).
5. Who are the end users/devices? If low-end Android in evacuation zones, the P0 audio finding and bundle split should be prioritized ahead of everything else.
