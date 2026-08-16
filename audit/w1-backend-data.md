# Audit W1 — Backend / Data Layer

Scope: `scripts/init.sql`, `lib/supabase.ts`, `lib/app-config.ts`, `lib/demo-data.ts`, `lib/message-media.ts`, `lib/phone-utils.ts`, `contexts/auth-context.tsx`, `components/chat-component.tsx`, `components/admin-panel.tsx`, `components/community-panel.tsx`, `components/volcano-status-banner.tsx`, `scripts/doctor.ts`. Read-only audit. Findings verified against file contents; line numbers refer to current HEAD.

---

## 1. Findings

### Security

1. **[P0][security] scripts/init.sql:314-326 (and all other tables) — RLS is enabled only on `puntos_encuentro`; the other 11 tables (`usuarios`, `informacion_volcan`, `parametros_volcan`, `alertas_volcan`, `configuraciones_nivel`, `recomendaciones_nivel`, `zonas_exclusion`, `acciones_requeridas`, `avisos_comunidad`, `mensajes_chat`, `logs_sistema`) have RLS OFF with Supabase default grants, so the anon key has full SELECT/INSERT/UPDATE/DELETE over the entire dataset. — Any visitor with the public anon key (embedded in the SPA bundle) can read every private chat message, every user name+phone, tamper with the alert level, and modify evacuation data. This is a public-safety integrity failure: an attacker can publish a fake "rojo/evacuación" alert or a false all-clear. — Recommendation: enable RLS on every table and define per-table policies; this requires real identity (see finding 3).**

2. **[P0][security] scripts/init.sql:319-326 — `puntos_encuentro` has `SELECT USING (true)` and `UPDATE USING (true)` with no `WITH CHECK` and no role restriction. — Any anon client can mark any evacuation point `ocupado` true/false directly, bypassing the admin RPCs (`cambiar_estado_punto_encuentro`, `resetear_puntos_encuentro`) that were written as the only "protected" path. During an emergency, one request can flip every point to LLENO or back. — Recommendation: restrict the UPDATE policy to an authenticated/authorized role, add `WITH CHECK`, and expose state changes only through SECURITY DEFINER RPCs that check role.**

3. **[P0][security] contexts/auth-context.tsx:38-41,113,277,315 — fake auth: identity is a full user row read from `localStorage["vulcania_usuario"]` with zero validation of the stored shape; login "verification" is a phone lookup against `usuarios` with no secret, and auto-create (L232-284) inserts a new row for any unknown phone. Any client can write `{"id":"<any-uuid>","telefono":"+569..."}` and be treated as that user. — Full impersonation: read and send private messages as any user, publish community avisos under their name. Every chat filter in chat-component is keyed on this forged id. — Recommendation: adopt Supabase Auth (phone OTP) and derive identity server-side; at minimum verify a server-issued session per request instead of trusting localStorage.**

4. **[P0][security] components/chat-component.tsx:121-123,234-236,263 — PostgREST `.or()` filter strings built by template-literal interpolation of user IDs taken from forged localStorage state. — The `.or()` grammar accepts arbitrary boolean expressions; a crafted ID can broaden the filter (e.g. read all conversations) or inject filter fragments. Even without crafted input, forging another user's id reads their chats because no RLS exists (finding 1). — Recommendation: RLS as primary defense; validate IDs as UUIDs before use; avoid `.or()` string building — use array containment (`receptor_id.in.()`) or an RPC with parameters.**

5. **[P1][security] components/chat-component.tsx:256,347-355; community-panel.tsx:113-125; volcano-status-banner.tsx:591-607 — realtime `postgres_changes` subscriptions carry no authorization beyond RLS, and RLS is absent; channel names embed user ids (`mensajes_chat_${id}_${id}`, `global_mensajes_${id}`). — Any client can subscribe to any conversation's channel or the global one and receive every new chat message, aviso, and alerta change live. — Recommendation: fix RLS first (realtime enforces it), then consider per-user private channels; never put identity in channel names as a security mechanism.**

6. **[P1][security] components/admin-panel.tsx:151,201,236,266 + lib/app-config.ts:22-25 — privileged operations (`cambiarNivelAlerta`, `cambiarEstadoPunto`, `resetearTodosPuntos`, `eliminarMensaje`) are gated only by a client-side flag (`enableAdminPanel`, Ctrl+Shift+A at L655) and executed through the same anon client; there is no `rol` column, no server-side check anywhere. — Any visitor can trigger an evacuation-level alert change, soft-delete messages, or reset points with a few lines in the browser console. — Recommendation: server-side role enforcement (RLS policies or SECURITY DEFINER RPCs that verify role); the keyboard shortcut must not be the production gate.**

7. **[P1][security] contexts/auth-context.tsx:167-169 — the login fallback fetches ALL `usuarios` rows (`select("*")`) and compares phone variants client-side. — Leaks every registered name + phone number to any anon client, and enables user enumeration. — Recommendation: single-row lookup by normalized phone (or by server auth); never select the whole table.**

8. **[P2][security] components/chat-component.tsx:430; community-panel.tsx:203,358 + lib/message-media.ts:29-36 — images are sent as base64 dataURLs embedded in the `mensaje`/`mensaje` TEXT column with `[img]...[/img]` markers; no size limit, no server-side type validation, Supabase Storage unused. — Base64 inflates payloads ~33%, TEXT is unbounded, and a 5 MB photo per message grows the DB and every SELECT payload; images render via `<img src="data:...">` (L671, community-panel L461). — Recommendation: upload to Supabase Storage, store the path, serve via signed URLs; enforce size/type limits server-side.**

9. **[P2][security] lib/message-media.ts:11-23 — `parseMessageMedia` is a naive indexOf-based parser that handles only the first `[img]` pair and trusts whatever sits between the markers; combined with no input validation on write, stored text can carry arbitrary data URLs rendered directly as `img src`. — Malformed or hostile media markers degrade rendering and open a content-injection vector (e.g. SVG data URLs). — Recommendation: validate image content server-side at write time; parse with a bounded format; consider a max image size on upload.**

10. **[P3][security] scripts/init.sql:348-351 — seed alert is inserted at level `rojo` ("NIVEL CRÍTICO PARA PRUEBAS", L343-345) — a fresh install boots straight into a red alert with an evacuation modal and siren for every user. — Confusing/dangerous default state for a real deployment; a misconfigured environment simulates a real emergency. — Recommendation: seed `verde`/`amarillo` and let operators raise the level deliberately.**

11. **[P3][security] components/volcano-status-banner.tsx:164-239,416-536 — hardcoded `emergencyData` and `simularCambioNivel` write simulated levels and random parameters directly into the production tables (gated only by `NODE_ENV === "development"`, L915, which is a build-time constant — unreachable in prod builds but trivially reproducible via console against the open tables). — The simulation scaffolding itself is not the risk (RLS is); but it demonstrates the intent gap: nothing distinguishes simulated from real monitoring data in the schema. — Recommendation: once RLS/roles exist, restrict writes to an operator role; consider a `fuente`/`es_simulacion` column.**

### Schema

12. **[P1][schema] scripts/init.sql:59-60,137 — `alertas_volcan.parametros_id` and `volcan_id` are FK columns without indexes; the app's canonical read pattern (volcano-status-banner.tsx:313-398) orders `alertas_volcan` by `ultima_actualizacion DESC` (indexed) then point-looks-up `parametros_volcan`/`informacion_volcan` by id, and `cambiar_nivel_alerta` appends a row per level change. — As alert history grows, each banner load pays sequential scans on both FK lookups. — Recommendation: `CREATE INDEX ON alertas_volcan(parametros_id); CREATE INDEX ON alertas_volcan(volcan_id);`**

13. **[P1][schema] scripts/init.sql:66,74,82 vs 42 — `recomendaciones_nivel`, `zonas_exclusion`, `acciones_requeridas` reference `configuraciones_nivel(nivel)` (a UNIQUE varchar) without `ON UPDATE CASCADE`; the banner additionally loads 7 tables in 7 sequential queries keyed on that string. — Any level rename (or re-seed) fails or orphans child rows; the string-keyed design forces join-less multi-roundtrip loads. — Recommendation: reference `configuraciones_nivel.id` with `ON UPDATE CASCADE` (or add it), and consider collapsing the three level-keyed tables into fewer tables.**

14. **[P2][schema] scripts/init.sql:33-35 — monitoring measurements stored as VARCHAR with units embedded (`'1,400°C'`, `'8,500 ton/día'`, `'15.2 cm/mes'`); `cambiar_nivel_alerta` (L151-216) fabricates them with `random()`. — Numeric comparison, trends, and alert thresholds are impossible at the SQL level; any string passes; stored "monitoring data" can be simulated noise. — Recommendation: numeric columns plus a units column (or JSONB), and keep simulation out of production tables.**

15. **[P2][schema] scripts/init.sql:114-115 — `mensajes_chat.emisor_id`/`receptor_id` are nullable with no `CHECK (emisor_id <> receptor_id)`, no `NOT NULL`. — Self-messages and messages with NULL endpoint are representable; the chat client never sends them today, but nothing in the schema forbids it. — Recommendation: `NOT NULL` + `CHECK (emisor_id <> receptor_id)`, or a `conversacion_id` model.**

16. **[P2][schema] scripts/init.sql:118-119,141 + lib/supabase.ts:155-157 + components/chat-component.tsx (read-state handled in a local `conversacionesLeidas` Set, never persisted) — the `leido`/`fecha_lectura` columns and their partial index exist but are never written by the app; unread counts are per-client state that resets on reload. — Schema and client disagree about where read state lives; the partial index is dead weight. — Recommendation: either write `leido` on read (and keep the index) or drop the columns.**

17. **[P2][schema] lib/supabase.ts:130-138 — `RutaEvacuacion` interface (with `coordenadas_geojson`) exists but there is no `ruta_evacuacion` table in init.sql and no query anywhere. — Phantom model: drift between the TypeScript contract and the schema; any future consumer will fail. — Recommendation: implement the table + seed or delete the interface.**

18. **[P2][schema] scripts/init.sql:392-393 vs lib/app-config.ts:21 and lib/demo-data.ts:8 — demo phone is triplicated with a format mismatch: DB seed `'+56900000000'` (no spaces) vs `APP_CONFIG.demoPhone '+56 9 8765 4321'` and `DEMO_USUARIO.telefono '+56 9 8765 4321'`. The demo-identity check in auth-context.tsx:99-100 compares against the app-config value, so on a real Supabase install the seeded "Demo" user is unreachable via the demo phone, and demo users (`demo-user`, `demo-maria`) exist only in client constants. — Demo/full data isolation is inconsistent: DB and client define different demo identities, and OFFLINE_USERS (chat-component.tsx:35-49) mixes demo ids into full-mode UI. — Recommendation: single source of truth for demo identity (env-driven), align the DB seed phone, and keep demo entities out of full-mode renders.**

19. **[P3][schema] scripts/init.sql:123-131,273-297 — `logs_sistema` is audited only for `puntos_encuentro` ocupado changes (trigger `log_cambio_estado_punto`); alert-level changes, aviso deletions, and chat mutations have no audit trail, and `registro_id` is a loose TEXT with no FK. — No way to answer "who changed the alert level and when" — the highest-stakes operation in the system. — Recommendation: extend the trigger pattern to `alertas_volcan` (and admin ops), add an actor column.**

20. **[P3][schema] scripts/init.sql:40-51 — `configuraciones_nivel` stores UI rendering config (Tailwind classes `bg_gradient`, `pulse_color`, `icon_name`) in the DB, interpolated into className strings (volcano-status-banner.tsx:659,671,673). — With RLS off, any client can rewrite the alert UI (colors, labels, gradient) of the whole app; even with RLS on, render config in DB is a footgun. — Recommendation: keep UI presentation in code; keep only semantic data (nivel, urgencia, descripcion) in the DB.**

### Performance

21. **[P2][perf] components/volcano-status-banner.tsx:313-398 — the banner performs 7 sequential awaited queries per load, and re-runs the whole chain on every realtime event (`event: "*"` on both `alertas_volcan` and `parametros_volcan`, L591-607), with no debounce. — Under alert churn every connected client fires a 7-query waterfall per event. — Recommendation: one joined query (or 2) and debounce reloads; prefer event-scoped reloads.**

22. **[P2][perf] components/chat-component.tsx:114-164,225-237 — conversation list does an N+1: one last-message query per user in `Promise.all` over the full user list, and message loads per conversation are unbounded (no `.limit`). — O(users) queries per conversation-list render; unbounded history selects grow every row forever. — Recommendation: windowed fetch (`.limit` + cursor), a single batched query, or an RPC returning last messages per conversation.**

23. **[P3][perf] community-panel.tsx:80,120-123 — every realtime INSERT triggers a full `cargarAvisos()` refetch of the last 20 rows. — Redundant full reload on each new aviso. — Recommendation: prepend the INSERTed row to local state (pattern already used after own sends, L238-240).**

### Functional

24. **[P2][func] scripts/init.sql (no realtime publication) — no `alter publication supabase_realtime add table ...` for any of `mensajes_chat`, `avisos_comunidad`, `alertas_volcan`, `parametros_volcan`, `puntos_encuentro`. — Every realtime subscription in the app (chat channels, avisos, volcano status) receives nothing until the publication is configured in the Supabase dashboard; realtime is silently dead on a fresh install while doctor.ts does not check it. — Recommendation: add the publication statements to init.sql (or document the dashboard step) and extend doctor.ts to verify them.**

25. **[P2][func] components/admin-panel.tsx:280-307 — level change performs a multi-step write (`parametros_volcan` INSERT then `alertas_volcan` INSERT) as two client-side requests with no transaction; failure between them leaves orphaned parameters or a level change without data; the same work exists as an atomic RPC (`cambiar_nivel_alerta`) that the client bypasses (it re-implements the logic with `Math.random()`). — Partial state on network failure; duplicate simulation logic diverging from the server function. — Recommendation: call `cambiar_nivel_alerta` via RPC (single atomic statement) instead of re-implementing it client-side.**

---

## 2. Schema-health summary

**What init.sql gets right:**

- FKs with `ON DELETE CASCADE` on chat/avisos keep referential integrity on user deletion.
- `CHECK` constraints on `nivel`/`estado`/`seguridad_nivel` keep domain values bounded at the DB level.
- `telefono` UNIQUE on `usuarios` gives the fake-auth flow a sane lookup key.
- Indexes cover the main read paths (`alertas_volcan.ultima_actualizacion DESC`, `avisos_comunidad.fecha_creacion DESC`, chat user pairs + partial unread index, `puntos_encuentro` location/ocupado).
- The plpgsql functions centralize state changes (`cambiar_nivel_alerta`, `cambiar_estado_punto_encuentro`, `resetear_puntos_encuentro`) — a good server-side pattern that the client unfortunately bypasses.
- The `puntos_encuentro` trigger-to-`logs_sistema` audit trail is well formed (IF OLD IS DISTINCT FROM NEW guard).
- Seed data for evacuation points is real (from Pucón-area informes) — good domain grounding.
- RLS is enabled on at least one table, showing intent; the execution is where it stops.

**What is risky:**

- RLS coverage: 1 of 12 tables, and even that one is open `USING (true)`. With Supabase's default grants this is effectively a public database with full write access — the single biggest issue in the project.
- No real identity: fake auth (phone + localStorage) means RLS policies have no principal to key on. The security model has to be rebuilt on Supabase Auth before policies can mean anything.
- Realtime publication missing: all realtime features are dead on a fresh install.
- Numeric monitoring data stored as display strings; simulation data indistinguishable from real data.
- No updated_at convention; "current alert" is inferred from a timestamp with ties possible.
- Interface/schema drift: `RutaEvacuacion` exists only in TS; `leido`/`fecha_lectura` only in SQL.
- Demo identity triplicated with a phone-format mismatch between seed and app config.
- Alert history grows unboundedly (one row per level change, never pruned).

---

## 3. Out of scope (one-liners)

- Frontend architecture, UX, and functional-defect audits are covered by sibling agents (running in parallel).
- Supabase dashboard configuration (realtime publication, auth providers, Storage buckets) cannot be fixed from this repo; noted as prerequisites.
- No `.env` files were read; all env-derived conclusions come from code paths only.

---

## 4. Open questions

1. Is Supabase Auth (phone OTP) planned, or is the localStorage fake-auth intentional for a demo-only product? RLS design depends on the answer.
2. Who are the "admins"? There is no `rol` column and no server-side role check; is the Ctrl+Shift+A panel the only intended gate?
3. Which demo identity is canonical: the DB seed `'+56900000000'` or `APP_CONFIG.demoPhone '+56 9 8765 4321'`? The current mismatch breaks demo login on real installs.
4. Is realtime expected to work in production, or is refetch-on-mount acceptable? (No publication config exists in the repo.)
5. Are monitoring parameters meant to become real SERNAGEOMIN data, or is simulation the permanent model? Determines whether VARCHAR measurements and `random()` fabrication are acceptable.
6. Is the SPA deployed against a live Supabase project today, and who operates the dashboard (RLS, realtime, storage) — does the team know the DB is open to the anon key?
