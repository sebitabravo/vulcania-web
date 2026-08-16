# Auditoría de Producto — W2

**Proyecto:** vulcania-web (monitoreo volcánico comunitario, zona Villarrica/Pucón, UI en español)
**Fecha:** 2026-08-16
**Base de evidencia:** `audit/w1-frontend-architecture.md`, `audit/w1-defects.md`, `audit/w1-performance.md`, `audit/w1-backend-data.md` + lectura directa de `app/page.tsx`, `lib/app-config.ts`, `components/volcano-status-header.tsx`, `components/emergency-modal.tsx`, `scripts/init.sql`, `README.md`
**Método:** solo lectura. Severidad mapeada a impacto de usuario final (vecinos en zona de riesgo), no a impacto técnico.

> Nota de premisas: las personas son hipótesis derivadas del código y del contexto (comunidades cercanas a Villarrica), **no** investigación de usuarios validada. No hay research, analytics ni tickets en el repo. Validar antes de invertir en features que dependan de ellas.
> Nota de consenso entre reportes: `components/volcano-status-banner.tsx` (1075 líneas) es código muerto (cero referencias, corregido por el audit de performance). El banner vivo es `volcano-status-header.tsx`. El hallazgo de "dos modales críticos" del audit frontend es **latente**: se materializa solo si el banner muerto se revive con su modal propia.

---

## 1. Personas y jobs-to-be-done

### Persona A — Vecina residente ("María", 40-60, vive en Pucón o sector rural al pie del Villarrica)

- **Contexto:** vive a 5-15 km del volcán; teléfono Android de gama media; familiarizada con alertas porque "el volcán es parte de la vida", pero no con la jerga técnica. En una crisis real su fuente hoy son radio, grupos de WhatsApp y redes (rumor incluido).
- **JTBD:**
  1. "Saber **ya** si mi familia y yo estamos en peligro" — leer el nivel de alerta vigente en 5 segundos, sin ambigüedad, desde el celular.
  2. "Saber **qué hacer**" — recomendaciones accionables por nivel (qué llevar, cuándo evacuar).
  3. "Saber **a dónde ir**" — punto de encuentro más cercano, si está lleno, cuánto tarda a pie.
  4. "Distinguir **oficial de rumor**" — saber si lo que ve viene de SERNAGEOMIN/SENAPRED o de un vecino.
- **Costo de no resolver:** desconfianza y abandono; en crisis, decisiones tardías o evacuaciones descoordinadas. Un falso positivo (sirena por error) quema la confianza de por vida.
- **Señal de éxito:** tiempo para encontrar el nivel vigente < 10 s; % de usuarios que confirman la fuente del dato.

### Persona B — Líder comunitaria / brigada de emergencia vecinal ("Carla", miembro de comité de emergencia comunal o junta de vecinos)

- **Contexto:** canal entre la institucionalidad y el barrio; coordina puntos de encuentro, avisa a vecinos sin teléfono, modera la información local; conoce a la gente por nombre.
- **JTBD:**
  1. "Publicar avisos locales verificables" — estado de un punto de encuentro, corte de camino, ayuda disponible.
  2. "Saber quién dice qué" — saber si un aviso viene de un vecino verificado o de un desconocido.
  3. "Coordinar sin llamar a 20 personas" — chat directo con vecinos clave y transmisión del mensaje oficial.
  4. "Reportar hacia arriba" — señalar un punto de encuentro lleno o una ruta bloqueada al operador.
- **Costo de no resolver:** la coordinación sigue en WhatsApp con información sin fuente; la plataforma no reemplaza nada.
- **Señal de éxito:** avisos comunitarios con autor visible y verificable; puntos de encuentro actualizados por la comunidad y confirmados por el operador.

### Persona C — Operador / administrador ("Rodrigo", encargado de emergencias comunal o del comité que opera la app)

- **Contexto:** recibe la comunicación oficial (SERNAGEOMIN/SENAPRED) y la refleja en la plataforma; hoy probablemente la reescribe a mano.
- **JTBD:**
  1. "Cambiar el nivel de alerta **solo cuando la fuente oficial lo dice**" — con doble confirmación y dejando rastro auditable.
  2. "Mantener los datos de evacuación sanos" — puntos de encuentro, capacidades, rutas.
  3. "Moderar contenido" — borrar avisos falsos o mensajes abusivos.
  4. "Saber qué cambió y cuándo" — auditoría de quién tocó qué.
- **Costo de no resolver:** hoy cualquier usuario puede hacer su trabajo (y equivocarse), y ningún cambio queda auditado.
- **Señal de éxito:** cero cambios de nivel sin fuente; auditoría completa de cada cambio.

**Persona extra que el producto hoy ignora — el visitante sin sesión:** la app es una plataforma de seguridad pública; un turista o vecino sin cuenta no debería necesitar login para ver el nivel de alerta vigente.

---

## 2. Story map de flujos actuales

Backbone: **Login → Estado volcán → Mapa → Comunidad → Chat** (+ modal de emergencia y panel admin como flujos transversales).

### Flujo 1 — Login (login-screen + auth-context)
| Qué funciona | Qué está roto | Qué falta |
|---|---|---|
| Entrada por teléfono, auto-creación de usuarios nuevos, modo demo | **No hay verificación**: "Enviando SMS..." es un `setTimeout` falso (frontend #1); la identidad es un lookup de teléfono forjable desde localStorage (backend #3) | OTP real (Supabase Auth) o decisión explícita de entrada sin verificar |
| — | Login fallido descarga **toda** la tabla `usuarios` al navegador (PII) (defects #1, backend #7); errores opacos "Error al iniciar sesión" (frontend #18) | Error con motivo tipado; lookup por teléfono normalizado, sin full-scan |
| — | Teléfonos inválidos pasan validación (`+56912345` aceptado) (defects #13); copy engañoso "Enviando SMS..." (frontend #26) | Validación de longitud canónica (12 dígitos) |
| — | Flag `loading` muerto → flash de usuario deslogueado en SSR (defects #19) | Estado de carga real |

### Flujo 2 — Estado del volcán (volcano-status-header + EmergencyModal)
| Qué funciona | Qué está roto | Qué falta |
|---|---|---|
| Badge de nivel (verde→rojo), descripción, "Actualizado hace X", suscripción realtime | **Sirena puede fallar silenciosamente**: AudioContext nuevo por beep (límite ~6 en Chrome) + polling REST 5 s de por vida + doble mecanismo (modal poll + header realtime) (perf #2, frontend #20) | Un solo suscriptor realtime; AudioContext único reutilizado |
| Modal de emergencia global (montada en layout, alcanza incluso sin login) con sonido en naranja/rojo y "Entendido" | Sonido **obligatorio e ininterrumpible** (comentario en código), sin control de usuario ni `prefers-reduced-motion` (frontend #6) | Control de sonido, guarda de motion, ack persistente |
| — | **Instalación nueva arranca en ROJO con sirena** (seed, backend #10); "emergencia" simulada indistinguible de real (backend #11) | Seed verde/amarillo; flag `es_simulacion`/`fuente` por alerta |
| — | El banner vivo muestra solo nivel+descripción; los parámetros (sismos, SO2) viven en el banner muerto de 1075 líneas; 7 queries secuenciales si se revive (perf #4) | Decisión: eliminar el banner muerto; si se revive, joins + cache |
| — | "Actualizado hace X" refleja el write en DB, no una emisión oficial | Fuente y nº de informe en cada alerta (ver §4) |

### Flujo 3 — Mapa (map-component / interactive-map)
| Qué funciona | Qué está roto | Qué falta |
|---|---|---|
| Puntos de encuentro con popup, botón "Navegar" (Google Maps), selector de ubicación, tiles OSM/Esri | **Marcadores duplicados** en cada recarga (sin `clearLayers`, frontend #10); remount completo del mapa con flash negro ante cualquier cambio de admin (perf #6) | `layerGroup` + diff; estado compartido sin `key`-remount |
| — | CSS de Leaflet desde unpkg en runtime (falla → mapa sin estilo; FOUC) (frontend #12, perf #3); popups HTML crudos con `onclick` inline (XSS latente) y carácter mojibake `�` en "Navegar" (frontend #11) | CSS bundlado; popups como nodos React |
| — | Init con `setTimeout` mágicos de `invalidateSize`; `leaflet: "latest"` desync con CSS hardcodeado 1.9.4 (perf #9) | ResizeObserver; pin de versión |
| — | **Zonas de exclusión existen en el schema y nunca se renderizan** (backend — tabla `zonas_exclusion` solo la lee el banner muerto); rutas de evacuación son interfaz fantasma (`RutaEvacuacion`, backend #17) | Capas de zona/radio por nivel; rutas reales |

### Flujo 4 — Comunidad (community-panel)
| Qué funciona | Qué está roto | Qué falta |
|---|---|---|
| Lista de avisos (últimos 20), crear aviso con imagen, realtime, hora relativa | Imágenes base64 en la DB sin límite ni recompresión (frontend #16, backend #8, perf #8); refetch completo de los 20 en cada INSERT realtime (backend #23) | Storage + límite de tamaño; prepend del row nuevo |
| — | `alert()`/`confirm()` nativos (frontend #22); timestamps demo congelados al cargar módulo → "Hace X" negativos (perf #12) | Toasts (infra ya existe, muerta: frontend #23) |
| — | Sin verificación de autor ni marcado oficial/comunitario; moderación solo por admin oculto | Verificación de avisos, roles visibles |

### Flujo 5 — Chat (chat-component)
| Qué funciona | Qué está roto | Qué falta |
|---|---|---|
| Conversaciones 1:1, preview de último mensaje, adjuntar imagen, realtime | **Enter no envía** (`onKeyPress` eliminado en React 19) — el envío principal falla en silencio (frontend #4) | `onKeyDown` |
| — | N+1 de stats (1 query por usuario, frontend #15, perf #5); refetch total ante **cada** mensaje global; suscripción recreada al marcar leído (perf #5); historial sin paginar (backend #22) | Una query agregada; invalidación por conversación; ventana + cursor |
| — | Badge de no-leídos hardcodeado a 1 (frontend #29); estado de leído solo en cliente, nunca persistido (backend #16); botón "Reset" de debug visible (frontend #26) | Conteo real; `leido` escrito; limpieza |
| — | Lista de conversaciones es un `div` clickeable sin role/tabIndex → inoperable por teclado/lector (frontend #5) | Accesibilidad de la lista |

### Flujos transversales — Emergencia y Admin
| Qué funciona | Qué está roto | Qué falta |
|---|---|---|
| Modal crítica global con sirena y ack; puntos de encuentro marcables lleno/libre | **Cualquier usuario autenticado abre el panel con Ctrl+Shift+A** y puede cambiar el nivel de alerta, marcar puntos y borrar avisos (frontend #2, backend #6); en modo completo el panel está **habilitado por defecto** (`enableAdminPanel = !demoMode`, app-config.ts) | Columna de rol + gate cliente y servidor (RLS) |
| RPCs atómicos bien diseñados (`cambiar_nivel_alerta`, `cambiar_estado_punto_encuentro`) | El cliente **los saltea**: reimplementa el cambio con 2 INSERT sin transacción y `Math.random()` (backend #25, frontend #14); historia de alertas crece sin límite | Llamar al RPC; upsert del vigente |
| — | Cambiar nivel no deja rastro (logs_sistema solo audita puntos, backend #19); modal duplicada latente si se revive el banner muerto (frontend #3) | Auditoría de alertas; una sola modal |
| — | **Todo el contenido tras el login**: visitante sin sesión solo recibe la modal crítica, no el estado (page.tsx:43-45) | Estado de emergencia público |

---

## 3. Backlog priorizado (mapeo Ola-1 → impacto usuario)

Escala de esfuerzo: **S** ≤ 1 día · **M** ≤ 3 días · **L** > 1 semana (1 dev). Agrupación: **P0** = integridad pública (suplantación / falso dato de emergencia), **P1** = función central rota o en riesgo justo en emergencia, **P2** = confianza, escala y accesibilidad, **P3** = higiene.

### P0 — Integridad pública

| # | Story | Evidencia | Esfuerzo |
|---|---|---|---|
| P0-1 | Cualquier persona que conozca un teléfono existente entra como ese usuario (login sin OTP, identidad forjable desde localStorage); con P0-5 escala a operador de alertas | frontend #1; backend #3 | L |
| P0-2 | Ningún visitante puede leer chats privados, nombres/teléfonos ni publicar un falso "rojo/evacuación" o falso all-clear (RLS apagada en 11 de 12 tablas con grants anon) | backend #1 | L (depende de P0-1) |
| P0-3 | En una emergencia nadie puede marcar todos los puntos de encuentro LLENO/LIBRE (UPDATE anon sin `WITH CHECK` ni rol) | backend #2 | S–M |
| P0-4 | Una instalación nueva no arranca en alerta ROJO con sirena — un entorno mal configurado simula una emergencia real | backend #10 | S |
| P0-5 | Abrir el panel admin (y cada mutación) exige rol de operador, no solo Ctrl+Shift+A para cualquier autenticado | frontend #2; backend #6 | M (depende de P0-1) |

### P1 — Funciones centrales rotas o en riesgo en emergencia

| # | Story | Evidencia | Esfuerzo |
|---|---|---|---|
| P1-1 | La sirena de emergencia suena siempre que debe: AudioContext único reutilizado, sin polling 5 s de por vida, un solo mecanismo de suscripción | perf #2; frontend #20 | M |
| P1-2 | Pulsar Enter en el chat envía el mensaje | frontend #4 | S |
| P1-3 | La lista de conversaciones carga con 1 query (no N+1) y no se re-fetcha entera ante cada mensaje ajeno; historial paginado | perf #5; frontend #15; backend #22 | M |
| P1-4 | La app carga rápido en Android gama baja: split por pestañas, supabase-js perezoso, CSS de Leaflet sin unpkg (LCP/TBT sobre presupuesto hoy) | perf #1/#3; frontend #12 | M–L |
| P1-5 | El login dice por qué falló y no descarga la tabla completa de usuarios; teléfonos inválidos rechazados | frontend #18; defects #1/#13; backend #7 | S–M |
| P1-6 | El banner de estado no cuesta 7 round-trips por carga ni re-fetch total por evento; el banner muerto (1075 L) se elimina o revive con joins | perf #4; frontend #13 | S (eliminar) / M (revivir) |
| P1-7 | El "tiempo real" funciona en una instalación nueva (publication de realtime falta en init.sql — hoy todo lo "en vivo" es falso) | backend #24 | S |
| P1-8 | Cambiar el nivel de alerta usa el RPC atómico (no 2 INSERT cliente con `random()` ni estado parcial ante fallo de red) y no acumula historia infinita | backend #25; frontend #14 | S–M |

### P2 — Confianza, escala y accesibilidad

| # | Story | Evidencia | Esfuerzo |
|---|---|---|---|
| P2-1 | El mapa no duplica marcadores ni parpadea en negro ante cambios de admin; popups sin XSS latente ni mojibake | frontend #8/#9/#10/#11; perf #6/#7 | M |
| P2-2 | Las imágenes no se guardan como base64 multi-MB en la DB (límite y recompresión hoy; Storage después) | frontend #16; backend #8/#9; perf #8 | M |
| P2-3 | El badge de no-leídos muestra el conteo real y persiste el estado de leído | frontend #29; backend #16 | S |
| P2-4 | Ningún teléfono/nombre de usuarios se imprime en consola en producción | frontend #17; defects #2 | S |
| P2-5 | La app es operable por teclado y lector de pantalla: lista de conversaciones, botones solo-icono, focus trap en modales; animaciones y sirena respetan `prefers-reduced-motion` | frontend #5/#6 | M |
| P2-6 | El nivel de alerta vigente y las recomendaciones se ven sin login (seguridad pública no puede estar tras un muro) | page.tsx:43-45 | M |
| P2-7 | La identidad demo tiene una sola fuente y el login demo funciona en instalaciones reales (seed DB vs APP_CONFIG no coinciden) | backend #18 | S |
| P2-8 | Lecturas de alerta con índices FK y referencias de nivel con cascade (renombrar nivel no rompe ni degrada) | backend #12/#13 | S |
| P2-9 | Los parámetros de monitoreo son datos numéricos comparables y la simulación está marcada como tal — decisión de producto primero (§4, Q6) | backend #11/#14 | M |
| P2-10 | El build vuelve a fallar ante errores de lint/type; lockfile commiteado; deploy con pnpm; `test-realtime` no apunta a un archivo inexistente | defects #3/#4/#7/#8/#9 | S |
| P2-11 | Cambiar el nivel de alerta deja rastro auditable (quién, cuándo, desde qué nivel) | backend #19 | S–M |

### P3 — Higiene

| # | Story | Evidencia | Esfuerzo |
|---|---|---|---|
| P3-1 | Diálogos nativos `alert()`/`confirm()` reemplazados por toasts (infra existe y está muerta) | frontend #22/#23; defects #6 | S |
| P3-2 | Sin restos de desarrollo en UI: botón Reset del chat, "Enviando SMS..." falso, emergencyData falso | frontend #26 | S |
| P3-3 | Sin huella v0.dev (`metadata.generator`), tema con pares light/dark reales, viewport móvil | frontend #7/#24/#25 | S |
| P3-4 | Ctrl+Shift+A no interrumpe la escritura en inputs | frontend #21 | S |
| P3-5 | Timestamps demo no congelados al cargar módulo (tiempos relativos no negativos) | perf #12 | S |
| P3-6 | `doctor` valida las 12 tablas (hoy 6) y el realtime publication | defects #17; backend #24 | S |
| P3-7 | Sin guerra de z-index, glob de Tailwind acotado, helpers de sonido/tiempo unificados, dead code (`use-mobile`, `toaster`) removido | frontend #19/#23/#27/#28 | S |

### Quick wins — resolver hoy, alto impacto, bajo esfuerzo

1. **Seed de alerta en verde/amarillo** (P0-4, S) — evita que un deploy nuevo simule una emergencia real.
2. **Fix Enter-para-enviar** en chat (P1-2, S) — el envío principal del chat está roto.
3. **Borrar restos de debug de la UI**: botón Reset del chat, "Enviando SMS..." falso, `emergencyData` (P3-2, S) — copy falso en una app de emergencias es un defecto de confianza.
4. **Validación de teléfono canónica** (P1-5 parcial, S).
5. **Error de login con motivo tipado** (P1-5 parcial, S).
6. **Publication de realtime en init.sql** (P1-7, S) — sin esto, "tiempo real" es mentira en toda instalación nueva.
7. **Badge de no-leídos con conteo real** (P2-3, S).
8. **Restaurar puertas de calidad**: quitar `ignoreBuildErrors`/`ignoreDuringBuilds`, fix `test-realtime` (P2-10, S).
9. **Eliminar `volcano-status-banner.tsx` muerto (1075 L)** o decidir su futuro (P1-6, S) — elimina el riesgo de modal duplicada (frontend #3) y 7-query chains del codebase.
10. **Corregir mojibake `�`** en el botón Navegar del mapa (P2-1 parcial, S) — visible en el flujo principal.
11. **Unificar identidad demo** (P2-7, S) — el login demo no funciona en instalaciones reales.
12. **`doctor` valida las 12 tablas** (P3-6, S) — hoy reporta saludable con el chat roto.

---

## 4. Brechas frente a la realidad del alertamiento chileno

1. **Escala dual sin declarar (crítico).** Chile convive con dos escalas: **SERNAGEOMIN** publica niveles de actividad volcánica de 4 niveles (Verde/Amarillo/Naranja/Rojo, vía OVDAS para Villarrica) y **SENAPRED** gestiona fases de emergencia de 3 niveles (Preventiva/Amarilla/Roja). La app usa 4 niveles (correcto para SERNAGEOMIN) pero **mezcla la terminología**: labels `NORMAL / PRECAUCIÓN / ALERTA / EMERGENCIA` y header "VOLCANO EMERGENCIA" cruzan nombres de fase SENAPRED con niveles SERNAGEOMIN (volcano-status-header.tsx:26-50). **La app debe declarar SIEMPRE qué escala muestra y de qué institución** — el costo de la confusión es un vecino que evacua (o no) por leer mal un color.
2. **Cadencia de reportes oficiales ignorada.** SERNAGEOMIN publica **RAV** (reporte de actividad volcánica, de cadencia diaria o mayor para volcanes activos), **REAV** (reporte especial ante cambios significativos — los que mueven el nivel) y reportes de evento/flash post-erupción. La app no modela informes: no hay nº de reporte, institución emisora, ni cadencia; "Actualizado hace X" mide un write en la DB (que puede ser simulación), no una emisión oficial. **Gap:** campo `fuente`/`referencia` (reporte + institución + fecha de emisión) por alerta, y UI que distinga "cambio oficial" de "simulación".
3. **Sin atribución de fuente ni enlace al reporte.** Una plataforma comunitaria sin fuente es rumor a escala; debe enlazar el RAV/REAV que respalda cada nivel.
4. **Un solo volcán hardcodeado** (Volcán Villarrica en el header y en el seed). Chile monitorea decenas de volcanes activos; decidir el alcance (solo Villarrica, o selector multi-volcán) explícitamente.
5. **Zonas de exclusión en el schema, invisibles en el mapa.** `zonas_exclusion` existe (radio_km por nivel) y solo la lee el banner muerto. Un vecino no ve qué radio está excluido a su nivel de alerta.
6. **Puntos de encuentro sin rutas.** `RutaEvacuacion` es una interfaz fantasma (backend #17): hay "a dónde ir" pero no "cómo llegar". El mapa tiene `tiempo_aprox_pie` y `capacidad` en el schema — explotarlos en la UI antes de agregar rutas.
7. **Sin contacto de emergencia accionable.** No hay botón de llamada a SENAPRED 130 (verificar número vigente), Carabineros 133, SAMU 131, ni a la red comunal.
8. **Avisos comunitarios sin verificación.** Nada distingue un aviso de un vecino verificado de uno anónimo; sin marcado "oficial/verificado" el flujo de comunidad amplifica rumores justo en emergencia.
9. **El operador no confirma ni deja rastro.** Un clic (o una petición forjada, P0-2) dispara sirena global; no hay doble confirmación "¿emitir rojo? — basado en REAV nº X" ni auditoría de cambios de nivel (P2-11).
10. **Notificaciones solo con app abierta.** Sin service worker ni push: la notificación de emergencia no llega si el navegador está cerrado — el canal más importante del producto no existe.
11. **Sin modo offline/PWA.** Una UI de emergencia debe degradar bien con conectividad mala; hoy todo depende de Supabase en línea.
12. **Sin relevancia geográfica.** Todos los usuarios ven el mismo estado sin importar su comuna o distancia al volcán; la decisión de evacuación es local.
13. **Sin respeto por baja alfabetización digital y discapacidad.** La accesibilidad técnica (P2-5) y el lenguaje de la UI (jerga técnica, copy en inglés "VOLCANO EMERGENCIA") son parte del mismo problema.

---

## 5. Fuera de alcance y preguntas abiertas

### Fuera de alcance (one-liners)

- Configuración del dashboard de Supabase (publication de realtime, buckets de Storage, proveedores de Auth) — prerequisito externo al repo, no arreglable desde código.
- Ingesta automática de RAV/REAV/SENAPRED desde feeds oficiales — requiere convenio o acceso API; hoy la entrada es manual.
- Apps nativas e infraestructura de push (service worker) — Ola posterior; notificaciones in-app sí.
- Multi-idioma (inglés turístico, mapudungun) — decisión de alcance, no defecto.
- Migración completa de media a Supabase Storage — P2-2 limita el tamaño hoy; Storage después.
- Chat grupal, comunidades múltiples, soporte multi-comuna.
- E2E tests y observabilidad externa (Sentry) — ya en roadmap del README.
- Reingeniería de identidad demo a multi-tenant.

### Preguntas abiertas (bloquean decisiones de producto)

1. **¿Prototipo demo o producto en producción?** Determina si los P0 son bloqueantes de release o deuda conocida de un prototipo. (También determina el riesgo real de los hallazgos 1-2 del audit frontend vía `enableAdminPanel`.)
2. **¿Escala canónica: SERNAGEOMIN 4 niveles o fases SENAPRED?** ¿Y quién dispara el cambio en la app — el operador re-escribe a mano lo que lee de SERNAGEOMIN?
3. **¿Quién opera la app?** ¿Existe un rol más allá de admin (operador de alertas, moderador comunitario)? No hay columna `rol`.
4. **¿Número real de usuarios y dispositivos?** El N+1 del chat y el peso del bundle escalan distinto con 50 o 5000 usuarios; el P0 de audio (perf) se prioriza si hay Android gama baja en zona de evacuación.
5. **¿Revivir o eliminar `volcano-status-banner.tsx` (1075 líneas muertas)?** Define el destino de parámetros de monitoreo, zonas de exclusión y el riesgo de doble modal.
6. **¿Los parámetros de monitoreo serán datos SERNAGEOMIN reales o simulación permanente?** Determina si VARCHAR+`random()` son aceptables (P2-9).
7. **¿Login con OTP real (Supabase) o entrada sin verificar como decisión consciente de baja fricción comunitaria?** Todo el diseño RLS cuelga de esta respuesta (P0-1/P0-2).
8. **¿El estado de emergencia debe ser visible sin login?** Mi recomendación: sí (P2-6).
9. **¿Identidad demo canónica: seed DB `'+56900000000'` o `APP_CONFIG.demoPhone`?** Hoy no coinciden (P2-7).
10. **¿Modelo de moderación de avisos comunitarios?** ¿Reportar→moderar, o edición comunitaria?
11. **¿El nivel de alerta se confirma con la fuente oficial antes de emitirse?** Define el flujo del operador (P0-5, P2-11).

---

*Documento de producto: mapea defectos técnicos a impacto de usuario; no reemplaza ni valida las correcciones técnicas de los informes W1.*
