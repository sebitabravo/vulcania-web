# Proposal — Vulcania: piso de confianza y rediseño del centro de monitoreo

## Meta

- **Feature:** vulcania-confidence-redesign
- **Author:** Codex
- **Status:** proposed
- **Date:** 2026-08-16

## Intent

Convertir el prototipo auditado en una demo honesta y un modo Supabase seguro,
con una interfaz de centro de monitoreo volcánico que pueda sostenerse en un
portfolio sin afirmar capacidades inexistentes. El cambio prioriza integridad
de alertas, autenticación, RLS, flujos de emergencia y accesibilidad antes del
acabado visual.

## Scope

### In

- Estado de alerta basado en la escala técnica SERNAGEOMIN de cuatro niveles.
- Modo demo offline funcional y explícitamente rotulado como simulación.
- OTP real mediante Supabase Auth en modo completo.
- RLS, roles de operador y RPCs atómicos para cambios sensibles.
- Una única modal de emergencia con audio compartido, mute explícito y contactos
  oficiales.
- Rediseño responsive light/dark, mapa accesible, chat/comunidad funcional y
  eliminación de código muerto/duplicado.
- Gates de lint, typecheck, tests, lockfile y scripts de diagnóstico.

### Out

- Integración real con la ingesta de RNVV/OVDAS; la fuente queda declarada en
  los datos y preparada para una integración posterior.
- Verificación de identidad de operador fuera de Supabase Auth.
- Despliegue, merge o publicación remota.

## Approach

Mantener Next.js 16 + React 19 + Tailwind/shadcn + Leaflet + Supabase. La UI
consume un mapa semántico central de niveles, la demo usa datos locales
mutables en memoria y sessionStorage y el modo completo usa Supabase Auth + RLS + funciones
SECURITY DEFINER. Se reemplazan consultas N+1, HTML de popup interpolado,
polling permanente y `localStorage` como sesión real.

## Constitution Alignment

| Principle | Aligned? | Notes |
|---|---|---|
| Cambios pequeños y verificables | ✅ | Se divide en módulos de dominio y se agregan tests de regresión. |
| Verificar antes de afirmar | ✅ | Lint, typecheck, tests, build y revisión de SQL/diff son gates explícitos. |
| Seguridad por defecto | ✅ | Supabase Auth, RLS por tabla, roles y RPCs atómicos. |
| Accesibilidad WCAG 2.2 AA | ✅ | Semántica, foco, touch targets, texto alternativo al mapa y reduced motion. |

## Rationale

| Alternative | Why Rejected |
|---|---|
| Mantener login custom en `localStorage` | No autentica identidad y hace inútil RLS para un producto de emergencia. |
| Reescribir todo a un backend propio | Aumenta superficie y desplaza el problema; Supabase ya es la dependencia operativa. |
| Mantener dos modales y polling de 5s | Duplica sirena/estado y puede fallar o abrir overlays contradictorios. |

## Affected Areas

- `app/`, `components/`, `contexts/`, `hooks/`, `lib/`
- `scripts/init.sql`, `scripts/doctor.ts`, `scripts/test-realtime.ts`,
  `scripts/deploy.ts`, `package.json`, `.gitignore`, `.env.example`
- `__tests__/` y `README.md`

## References

- [SERNAGEOMIN — RNVV](https://www.sernageomin.cl/rnvv/)
- [SERNAGEOMIN — niveles de alerta volcánica](https://www.sernageomin.cl/abc/doc/Alerta_Volcanica.pdf)
- [SENAPRED — números de emergencia](https://dev.senapred.cl/)
