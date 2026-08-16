# DESIGN.md — Vulcania

Design system implementado para la plataforma de monitoreo volcánico comunitario. Derivado de la auditoría multi-agente (agosto 2026): investigación de benchmarks internacionales (USGS, SENAPRED, FEMA/Ready.gov), contexto institucional chileno (SERNAGEOMIN RNVV/OVDAS, SENAPRED) y auditoría del código actual. Ver `audit/w2-design-research.md` para el detalle con fuentes.

**Dirección: "Centro de Monitoreo Volcánico".** El producto debe sentirse como el interior de una sala de monitoreo OVDAS de noche: calmo, denso, preciso, oscuro. Instrumentación que se puede confiar — no una app de consumo. La única vez que levanta la voz es cuando el volcán lo hace. Varianza de diseño: 4/10 — restringida por el dominio (credibilidad de emergencia > novedad), elevada por tipografía y tipografía de datos, no por decoración.

---

## 1. Principios

1. **La confianza es el producto.** Cada pantalla responde "¿quién lo dice?" — fuente, institución y timestamp en cada dato. La frontera entre capa oficial (SERNAGEOMIN) y capa comunitaria (vecinos) es explícita y nunca se mezcla visualmente.
2. **Calma por defecto, urgencia reservada.** Si todo pulsa, nada alerta. El color saturado existe solo para los 4 niveles de alerta.
3. **Color nunca solo.** Nivel de alerta = color + ícono + etiqueta textual + patrón (WCAG 1.4.1). El usuario con daltonismo o lector de pantalla lee la misma alerta.
4. **El texto es la interfaz de emergencia.** Lista de texto alternativa al mapa (patrón USGS), copy imperativo es-CL, timestamps es-CL siempre ("Actualizado hace 5 min (HH:MM hora local Chile)").
5. **Precisión temporal absoluta.** Antigüedad de la información ES información: "sin datos desde las 11:40" es un estado visible, no un silencio. Doble timestamp local/UTC en detalle.
6. **Accesibilidad como canal de emergencia.** Operable por teclado y lector de pantalla a ciegas durante una evacuación. No es cumplimiento, es el canal de una parte de la comunidad.

## 2. Tokens

### 2.1 Color — neutros (dark, superficie primaria)

| Token | OKLCH | Hex ref |
|---|---|---|
| `background` | `0.10 0.012 250` | `#0b0f14` |
| `surface` | `0.12 0.014 250` | `#11161d` |
| `surface-2` | `0.15 0.016 250` | `#161d26` |
| `border` | `0.20 0.02 250` | `#1f2833` |
| `text` | `0.93 0.008 250` | `#eef1f5` |
| `text-muted` | `0.72 0.02 250` | `#a9b2bf` (≥ 4.5:1 sobre background) |
| `accent` (nav/interacción) | `0.62 0.12 250` | azul acero |

Neutros con tinte frío (matiz 250). Prohibido negro puro: halación, sin profundidad. El accent azul acero se usa SOLO para navegación e interacción — nunca para status.

### 2.2 Color — niveles de alerta (único uso de color saturado)

Escala canónica: **SERNAGEOMIN 4 niveles** (coincide con el modelo de datos). Badge siempre: color + ícono + etiqueta + patrón.

| Nivel | OKLCH | Hex ref | Ícono | Patrón |
|---|---|---|---|---|
| Verde | `0.72 0.19 150` | `#4ade80` | ShieldCheck | — |
| Amarilla | `0.85 0.16 90` | `#facc15` | AlertTriangle | — |
| Naranja | `0.68 0.19 45` | `#fb923c` | Flame | franjas diagonales en banner |
| Roja | `0.55 0.21 27` | `#ef4444` | Siren | franjas diagonales + borde pulsante one-shot |

Contraste: todos ≥ 4.5:1 contra fondo oscuro para texto/badges; los colores de nivel se usan como superficie de badge con texto oscuro o como acento de ícono con etiqueta — nunca como color de texto pequeño sobre fondo oscuro sin acompañar.

### 2.3 Semaforización del estado (light mode — secundario, lectura solar)

Mismos matices, saturación reducida (~60%): Verde `0.76 0.11 150`, Amarilla `0.88 0.10 90`, Naranja `0.74 0.12 45`, Roja `0.62 0.14 27`. Neutros: `background` `0.97 0.005 250` (`#f7f9fb`), `text` `0.22 0.015 250` (`#10151c`).

### 2.4 Tipografía

| Rol | Fuente | Notas |
|---|---|---|
| Display/títulos/nombres de volcán | **Space Grotesk** | técnica, confiable, es-CL friendly |
| Body/copy | **IBM Plex Sans** | x-height grande, legible bajo estrés, glifos españoles completos; 16px min; line-height 1.6 |
| Datos/telemetría/timestamps | **IBM Plex Mono** (tnum) | lenguaje de cockpit: separa *hechos* de *guía* |

Escala: minor third 1.25 (denso para datos). Copy de la modal de alerta ≥ 18px. Auto-hosted vía `next/font`, `display: swap`. Inter: prohibida. Prohibido `font-sans` sin definir.

### 2.5 Espaciado y radio

- Espaciado 4px base (Tailwind default), densidad cockpit para datos, generosa para guía.
- Radio: `--radius: 0.5rem` (mantener shadcn); tarjetas de datos `rounded-md`, badges `rounded-full`, superficies de emergencia `rounded-lg`.
- Prohibido anidar cards más de un nivel — dividir con separadores y whitespace.

## 3. Componentes

### 3.1 Status Banner (anatomía derivada de USGS)

```
Volcán Villarrica            [Amarilla]  [SERNAGEOMIN]
Actualizado hace 5 min — 16:42 hora local Chile
Nivel de actividad volcánica en ascenso. Monitoreo reforzado.
▸ Ver detalle            Fuente: RAV N° 214/2026 — Sernageomin RNVV/OVDAS
```

- Orden inviolable: nombre → badge (color+ícono+etiqueta+patrón) → freshness → resumen plain-language de 1 línea → detalle → fuente.
- Cambio de nivel muestra delta: "Nivel anterior: Verde".
- Estado calmo explícito: "Monitoreo normal — sin alertas activas" (patrón USGS "all NORMAL").
- Timestamps es-CL + UTC en detalle. `aria-live="polite"` para cambios de nivel.

### 3.2 Emergency Modal (única, global)

- Un solo modal en el layout, una sola suscripción realtime, un solo bucle de audio.
- Semántica Radix Dialog `modal`: `role="alertdialog"`, `aria-labelledby`/`aria-describedby`, focus trap, Escape, focus inicial en la acción primaria.
- Sonido: chirrido ON por defecto solo naranja/roja, botón de silencio DENTRO de la modal, preferencia persistida. Nunca dos bucles simultáneos.
- `prefers-reduced-motion: reduce` → variante estática alto contraste, sonido OFF por defecto.
- Copy: imperativo es-CL + número verificado: **131 SAMU / 132 Bomberos / 133 Carabineros** (verificar contra SENAPRED antes de ship; fuente única de config, nunca inline).

### 3.3 Mapa

- Basemap oscuro (CartoDB dark_matter) como *chrome* cartográfico legible; los marcadores son el contenido.
- Marcador de volcán: rombo neutral con etiqueta técnica; el nivel oficial se lee en el encabezado para no duplicar estados ni inventar un nivel en el mapa.
- Marcador de punto de encuentro: cuadrado + ícono (forma distinta del volcán: los puntos nunca deben leerse como niveles), min 40px, ideal 44px.
- Leyenda siempre visible (colapsable en móvil): color + ícono + texto por nivel y por tipo de punto.
- Lista de texto alternativa debajo del mapa: "Puntos cercanos" con badges (patrón USGS; ruta de teclado/SR).
- Popups como nodos React con botones reales ("Navegar", "Ver ruta"). Sin emoji, sin onclick inline, sin glyphs rotos.
- Empty state: "Sin puntos registrados — registra el primero".
- Zonas de exclusión (radio por nivel, ya en schema) renderizadas como círculos según nivel.

### 3.4 Chat / Comunidad

- Lista de conversaciones con semántica de botón real, badges de no-leídos con conteo real (`aria-live`).
- Composer: Enter envía (`onKeyDown` + guard de IME), adjuntar imagen con límite de tamaño y recompresión (base64 capado hoy; Storage después).
- Avisos comunitarios con autor visible y marcado verificado/oficial vs comunitario — la frontera entre capas ES el producto.
- Empty states: "Sin mensajes — inicia la conversación", "Aún no hay reportes — comparte el primer avistamiento".
- Timestamps demo derivados de session-start ref, nunca congelados al cargar módulo.

### 3.5 Admin / Operador

- Gate de rol servidor + confirmación de doble paso para cambio de nivel con blast-radius: "¿Emitir Roja? — basado en REAV N° X".
- Auditoría visible: quién, cuándo, desde qué nivel.
- Uso de RPCs atómicos existentes; el cliente no re-implementa lógica con `random()`.

## 4. Motion

- **Funcional solamente**: guiar atención (cambio de nivel), mostrar relación (anillo de marcador), dar feedback (presión de botón). Nada decorativo.
- Micro-interacciones: 150-200ms, `cubic-bezier(0.4, 0, 0.2, 1)`.
- Escalada (nivel sube) = única animación enfatizada: banner 200ms de cambio de color, modal 300ms `cubic-bezier(0.22, 1, 0.36, 1)`, anillo one-shot en el badge. **Prohibido pulse/bounce perpetuo.**
- List stagger: 60ms por hijo.
- `prefers-reduced-motion: reduce` → CSS estático, alto contraste y sonido off.
- Sin scroll suave forzado global.

## 5. Accesibilidad (WCAG 2.2 AA)

- `aria-*` en toda la superficie: botones solo-ícono con `aria-label`, `aria-live` para alertas/badges, `role="dialog"`+`aria-modal`+focus trap en modales, roles de tabulación para tarjetas clickeables.
- Touch targets ≥ 44px (WCAG 2.5.8). Contraste `text-muted` ≥ 4.5:1.
- Foco visible global tokenizado, extendido a controles Leaflet.
- Teclado: mapa operable (lista de texto alternativa), modales con gestión de foco completa.
- Anuncio de cambio de nivel vía live region polite en el banner.

## 6. Modos claro/oscuro

- `:root` = light, `.dark` = dark (esquema actual). `darkMode: ["class"]` + default `prefers-color-scheme` + toggle manual persistido.
- Dark es la cara primaria (operación 24/7); light secundaria (lectura solar en terreno).
- El basemap oscuro se mantiene como chrome cartográfico legible; el shell sí admite tema claro/oscuro.
- Migrar de colores hardcodeados (`bg-gray-900`, hex) a tokens `bg-background`/`bg-card`/`text-foreground`/`text-muted`.

## 7. Copy (voz SENAPRED)

- Imperativo + objeto concreto: "Revisa tu plan de evacuación", no "Información de seguridad disponible".
- Errores: qué pasó + cómo arreglarlo. Placeholders son ejemplos, nunca labels.
- Vocabulario de alerta oficial únicamente: "Alerta Amarilla (SERNAGEOMIN)". La escala nunca es invento propio.
- Prohibido: emojis como iconos (lucide only), "VOLCANO EMERGENCIA", "Enviando SMS..." falso, jerga técnica sin traducción.

## 8. Mapeo a implementación

- Tailwind 3 + shadcn/ui actuales; tokens HSL var en `globals.css`, pares `:root`/`.dark`.
- `components.json`: baseColor "neutral" → realineado a los tokens nuevos.
- Componentes del sistema: reutilizar primitivas shadcn (button, dialog, badge, card, tabs); `next/font` y `tsx` solo soportan tipografía/scripts locales.
- Nivel de alerta → un único mapa nivel→tokens (color/ícono/label/patrón) en `lib/`; la DB guarda el key semántico ("rojo"), nunca clases Tailwind ni hex.
- Eliminar: `metadata.generator` v0.dev, keyframes manuales de bounce/pulse, `.eslintrc.json` legacy, código muerto (toaster, use-mobile, banner 1075L).
- Componentes monstruo: dividir a 200-300 LOC/archivo (plan completo en `audit/w1-frontend-architecture.md`).

## 9. Decisiones cerradas de implementación

1. **Escala canónica:** SERNAGEOMIN, con verde/amarillo/naranja/rojo; SENAPRED queda como guía operativa.
2. **Números de emergencia:** 131 SAMU, 132 Bomberos y 133 Carabineros desde `lib/emergency-contacts.ts`.
3. **Sonido:** singleton para naranja/rojo; se desbloquea por gesto, respeta reduced motion y tiene mute persistido.
4. **Brand:** Vulcania es la marca única; “emergencia” se reserva para la modal crítica.
5. **Demo vs full:** demo verde y rotulado; full usa Supabase Auth OTP, RLS, RPC y Realtime.
6. **Tema:** dark y light con toggle persistido; el modo dark mantiene la identidad de sala de monitoreo.

---

*Design system implementado localmente. La ingestión de datos oficiales, el E2E autenticado y el despliegue siguen siendo gates externos y no se declaran aquí como resueltos.*
