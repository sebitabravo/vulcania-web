# Auditoría comparativa de estilo e identidad

**ORIGINAL** — `014e7e5` (v0 prototipo) · **NUEVO** — HEAD (`main`)
**Pregunta**: ¿el rediseño perdió el estilo y las cosas características de Vulcania?

---

## Método

Se compararon ambas versiones de los 9 archivos núcleo + el sistema de diseño declarado:

| Archivo | ORIGINAL | NUEVO |
|---|---|---|
| `app/globals.css` | ✓ | ✓ |
| `app/layout.tsx` | ✓ | ✓ |
| `app/page.tsx` | ✓ | ✓ |
| `tailwind.config.ts` | ✓ | ✓ |
| `components/login-screen.tsx` | ✓ | ✓ |
| `components/emergency-modal.tsx` | ✓ | ✓ |
| `components/interactive-map.tsx` | ✓ | ✓ |
| `components/community-panel.tsx` | ✓ | ✓ |
| `components/chat-component.tsx` | ✓ | ✓ |
| `components/volcano-status-header.tsx` | ✓ | ✓ |
| `DESIGN.md` | — | ✓ |
| `specs/vulcania-confidence-redesign/proposal.md` | — | ✓ |

Veredictos: **KEPT** (se conserva) · **TRANSFORMED** (se conserva cambiado de forma) · **LOST** (se pierde) · **RESTORED** (se recuperó durante el cierre comparativo).

---

## 1. Qué hacía "Vulcania" al original

Cinco ejes de identidad, todos presentes en el código de `014e7e5`:

1. **Oscuridad + rojo volcánico.** Fondo negro puro (`--background: 0 0% 0%`, globals.css ORIGINAL), acento rojo global (`--accent/--destructive/--ring: 0 100% 50%`), wordmark "VOLCANO EMERGENCIA" con `text-red-500` (page.tsx ORIGINAL) y gradiente rojo→naranja en `.text-gradient` (`linear-gradient(135deg, #ef4444, #f97316)`). El color del fuego era el color del producto.
2. **Emojis como iconos y como voz.** 🚨 (modal, botones de test), ⚠️, 🔊 (sirena continua), 🚀 (acceso demo), 💡 (tip del 9), 👥📊🚶🛡️ (popups del mapa), 🚫 (punto lleno), 📱 (Ver RA), 🚗 (badge GPS), 🔄 (reset). Incluso los logs (`logger.debug("🎵 Creando sonido...")`) usaban emojis. El producto hablaba con stickers.
3. **Alarma perpetua.** `animate-pulse` y `animate-bounce` en modal, botones de test, banner de sonido; hover-lift con sombra roja; sonido de sirena obligatorio sin mute (comentario literal en emergency-modal.tsx ORIGINAL: "ELIMINAMOS soundEnabled - el sonido SIEMPRE debe sonar"); spinner de login con "Enviando SMS..." y delay falso de 2s.
4. **Voz de guardián.** "Un guardián que vigila y guía" (login), "Bienvenido, {usuario.nombre}" (page.tsx), tabs con color propio por identidad (Mapa rojo / Comunidad azul / Chat verde), mapa OSM claro con marcadores de círculos de colores.
5. **Marca bisílaba de demo.** `<title>VULCANIA - Demo</title>` + `generator: "v0.dev"` (layout.tsx ORIGINAL): el producto se presentaba como demostración, pero con pretensiones de emergencia (sirena, SMS falso).

El nombre "Volcania" no existía como marca: existía "VOLCANO EMERGENCIA" con la montaña (icono `Mountain` en círculo negro borde blanco) como único emblema visual. La montaña era el único símbolo gráfico con carácter propio.

## 2. Qué conserva / descarta / agrega el nuevo

**Conserva** (KEPT, ver §3): montaña como logo, oscuridad como modo por defecto, rojo para el peligro, tres pestañas (Mapa/Comunidad/Chat), escala de 4 niveles con ícono+color+etiqueta, voz comunitaria en español es-CL, mapa con puntos de encuentro, modo demo con datos locales, sonido de alerta (ahora silenciable).

**Descarta**: emojis como iconos (lucide solo, prohibido explícitamente en DESIGN.md), wordmark "VOLCANO EMERGENCIA", gradiente rojo-naranja, pulse/bounce perpetuo, spinner falso de SMS, fingerprint v0.dev, sonido obligatorio sin mute, tabs multicolor, hover-lift, popups HTML interpolados, leaflet-css inyectado a mano.

**Agrega**: sistema de tokens HSL con neutros teñidos (hue 250, nada de gris muerto), azul acero (`primary: 204 82% 40%`) como único acento de navegación, escala SERNAGEOMIN como **único** lugar donde viven colores saturados, tipografía propia (Space Grotesk display / IBM Plex Sans body / IBM Plex Mono datos), micro-etiquetas mono en mayúsculas ("Panel de situación", "Cartografía de apoyo", "Coordinación directa"), patrón `status-stripes` para niveles críticos, badges de "Simulación demo" honestos, atribución de fuente en cada dato (SERNAGEOMIN/SENAPRED), modal única con `role="alertdialog"` y foco gestionado, mapa dark (CartoDB dark_all) con zona de exclusión punteada teñida por nivel, lista textual accesible alternativa al mapa, WCAG 2.2 AA + `prefers-reduced-motion` + modo claro/oscuro.

## 3. Veredicto por elemento de identidad

| # | Elemento | Veredicto | Evidencia |
|---|---|---|---|
| 1 | Montaña como emblema | **KEPT** | ORIGINAL: `Mountain` en círculo negro borde blanco (page.tsx). NUEVO: `Mountain` en caja `rounded-xl border-primary/40 bg-primary/10` (page.tsx:93-95; login). Mismo símbolo, marco nuevo. |
| 2 | Oscuridad como identidad | **KEPT** (corregido) | ORIGINAL negro puro `0 0% 0%`. NUEVO `216 27% 7%` (globals.css `.dark`): negro real, teñido, no `#000`. El dark sigue siendo el modo principal (DESIGN.md §8). |
| 3 | Rojo = volcán/peligro | **TRANSFORMED** | De acento global (wordmark, focus rings, spinners, sombras) a color **semántico de alerta**: `--destructive` + nivel "rojo" `#ef4444` (lib/alert-levels.ts:83), modal sobre `#160c0f` con `status-stripes` (emergency-modal.tsx:119). El rojo pasó de "el producto es rojo" a "el peligro es rojo". Ganancia de legibilidad, pérdida de temperatura visual. |
| 4 | Escala de 4 niveles con ícono+color | **KEPT** (corregido) | ORIGINAL: NORMAL/PRECAUCIÓN/ALERTA/EMERGENCIA con círculos de color (volcano-status-header.tsx ORIGINAL). NUEVO: "Alerta Verde/Amarilla/Naranja/Roja" — vocabulario oficial SERNAGEOMIN (lib/alert-levels.ts:27-86), ícono por nivel (ShieldCheck/AlertTriangle/Flame/Siren) + patrón de franjas en críticos. Misma arquitectura visual, ahora con fuente declarada y patrón redundante (color+ícono+texto+patrón). |
| 5 | Tabs Mapa/Comunidad/Chat | **KEPT** (aplanado) | ORIGINAL: activa roja/azul/verde por tab (page.tsx ORIGINAL). NUEVO: activa uniforme `bg-primary` azul (page.tsx:154-162). La tricolor era el rasgo más "bingo de startup"; la uniformidad compra coherencia. |
| 6 | Emojis como iconos | **LOST** (intencional, correcto) | Inventario completo del ORIGINAL (🚨⚠️🔊🚀💡👥📊🚶🛡️🚫📱🚗🔄) reemplazado por lucide + etiqueta. DESIGN.md lo prohíbe ("Prohibido: emojis como iconos (lucide only)"). El carácter "pegajoso" se fue con ellos. |
| 7 | Voz de guardián | **TRANSFORMED** | "Un guardián que vigila y guía" → "Información clara cuando más importa" (login) / "Tu red, en un solo lugar." (page.tsx:129). De protector personal a red comunitaria vigilante. Tono SENAPRED: imperativo sereno ("Sigue las instrucciones de evacuación", emergency-modal.tsx:150). |
| 8 | Wordmark "VOLCANO EMERGENCIA" | **LOST** (intencional, correcto) | NUEVO: wordmark "Vulcania" + badge "Monitor" (page.tsx:98-99); "emergencia" se reserva para la modal crítica (DESIGN.md §9.4). El original gritaba emergencia 24/7 sin ingesta real — mentira de producto; el nuevo la reserva para cuando existe. |
| 9 | Sonido de alerta | **TRANSFORMED** | ORIGINAL: sirena obligatoria, imposible de silenciar ("el sonido SIEMPRE debe sonar"). NUEVO: mismo patrón de sirenas (lib/alert-sound), pero con mute explícito persistido y default respetuoso de `prefers-reduced-motion` (emergency-modal.tsx:26-36, 91-100). La funcionalidad quedó, el acoso sonoro no. |
| 10 | Mapa | **TRANSFORMED** | ORIGINAL: OSM claro, marcadores círculos de colores, popup HTML con emojis, GPS/Street View/RA, CSS inyectado. NUEVO: CartoDB dark_all (sala de monitoreo nocturna), rombo de volcán `#93c5fd` + punto verde + lleno rojo (globals.css `.vulcania-marker-*`), zona de exclusión punteada teñida por nivel, leyenda, lista accesible. Mismo mapa, otro registro: de app de turista a consola técnica. |
| 11 | Mapas claros de la demo | **TRANSFORMED** | El mapa dark y la lista accesible reemplazan la superficie clara; `Ver RA`/Street View fue restaurado como enlace externo seguro y `Ver mapa` permanece. |
| 12 | Tip del 9 telefónico | **RESTORED** | `components/login-screen.tsx` conserva la ayuda como texto: "El 9 se agrega automáticamente después de +56", respaldada por `formatTelefonoInput`. |
| 13 | "Bienvenido, {nombre}" | **RESTORED** | `app/page.tsx` muestra `Bienvenido, {usuario.nombre}.` sobre el panel de situación; el header conserva iniciales/nombre. |
| 14 | Gradiente rojo-naranja / hover-lift / pulse | **LOST** (correcto) | Decoración sin función, reemplazada por motion funcional 150-200ms con `prefers-reduced-motion` (globals.css NUEVO). Nada de carácter real se fue: eran slop de v0. |
| 15 | Fingerprint v0.dev | **LOST** (correcto) | `generator: "v0.dev"` eliminado (layout.tsx NUEVO); metadata "Vulcania · Centro de monitoreo volcánico" + `lang="es"`. |
| 16 | Falsa infraestructura | **LOST** (correcto) | "Enviando SMS..." con delay falso → "Estás viendo una demostración local. No se envía ningún SMS real." (login NUEVO). Es el cambio de honestidad que justifica casi todas las pérdidas anteriores. |

## 4. Veredicto global: ¿mismo producto o sobrecorrección?

**Mismo producto, mejor versión de la misma identidad. No hubo sobrecorrección.**

Razones:

- **Los anclajes de identidad sobreviven**: la montaña, la oscuridad, el volcán Villarrica, la comunidad es-CL, los tres espacios (mapa/comunidad/chat), la escala de 4 niveles y la alerta sonora. Nada de lo que un usuario recordaría como "esto es Vulcania" se borró; se re-marcó.
- **El rojo no se fue, cambió de trabajo**. Era el color del lienzo (acento global); ahora es el color del peligro (escala de alerta). Para una app de emergencia, ese es el uso correcto del rojo: contraste alto contra neutros fríos, no rojo sobre negro.
- **Lo que se perdió era en gran parte ruido de plantilla** (v0): gradiente, bounce, pulse, emojis, SMS falso, tabs tricolor, v0.dev. El carácter real (volcán, oscuridad, comunidad, español) era más profundo que esos artefactos.
- **Las pérdidas de carácter restantes están justificadas por el objetivo declarado del rediseño** (proposal.md: "demo honesta... sin afirmar capacidades inexistentes"): quitar "VOLCANO EMERGENCIA" no es censura estética, es dejar de mentir; reservar "emergencia" para la modal crítica (DESIGN.md §9.4) es la decisión de marca que sostiene la honestidad.
- **El nuevo tiene carácter propio donde el original no tenía**: la tipografía Space Grotesk + micro-etiquetas mono (voz de OVDAS/sala de monitoreo), el mapa dark con zona de exclusión punteada, el rombo del volcán `#93c5fd`, el patrón `status-stripes`, la redacción SENAPRED. El original era "negro + rojo + emojis"; el nuevo es "sala de monitoreo de noche". Ese es un estilo más específico, no menos.

Riesgo real, y único: **la sobriedad nueva puede leerse como "cualquier SaaS"** si el usuario no está atento a la escala de alerta, los micro-labels mono y el mapa dark. El original era inconfundible (por malas razones); el nuevo necesita que la identidad se apoye en lo que ya construyó: la montaña, el rombo del volcán y el lenguaje SERNAGEOMIN.

## 5. Regresiones concretas de carácter (revisar)

| Severidad | Ítem | Nota |
|---|---|---|
| Cerrado | Tip "El 9 se agrega automáticamente" | Restaurado como copy sobrio bajo el input y cubierto por test. |
| Cerrado | "Ver RA" / Street View eliminado del mapa | Restaurado como enlace externo documentado con `api=1&map_action=pano&viewpoint`. |
| Media | Tabs tricolor (rojo/azul/verde) → azul único | Decisión de sistema correcta, pero es el cambio más visible para quien usaba la demo. Considerar acento por tab en el borde inferior del tab activo (manteniendo un solo hue). |
| Cerrado | "Bienvenido, {nombre}" → iniciales | Restaurado como saludo discreto sin quitar la identificación del header. |
| Baja | Tagline "Un guardián que vigila y guía" | El concepto "guardián" desapareció; el nuevo se apoya en "red". Si se quiere mantener la metáfora, cabe en una línea del login o del footer ("Vigilamos juntos"). |
| No-regresión | Emojis, gradiente, pulse, SMS falso, wordmark EMERGENCIA | Pérdidas correctas y verificadas como intencionales (DESIGN.md lista prohibidas). |

---

**Conclusión en una línea**: el rediseño no perdió la identidad; le quitó el disfraz de alarma y le dio un sistema (escala SERNAGEOMIN, tokens teñidos, voz SENAPRED). La montaña, la oscuridad y la comunidad siguen siendo las mismas; el tip del 9, `Ver RA` y el saludo fueron restaurados sin reintroducir emojis, gradientes ni alarma perpetua.


## 6. Cierre comparativo

Las tres pérdidas UX menores señaladas por esta auditoría quedaron corregidas:
`Ver RA` usa la URL oficial de Google Maps Street View por viewpoint, el tip del
9 describe el formatter real y la shell volvió a saludar al usuario. La identidad
visual no se revirtió: siguen vigentes lucide-only, escala semántica, mapa dark,
provenance demo, `alertdialog`, mute y reduced-motion.
