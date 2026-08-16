# Proposal — comparative-regression-closure

## Meta
- **Feature:** comparative-regression-closure
- **Author:** Codex
- **Status:** proposed
- **Date:** 2026-08-16

## Intent
La auditoría comparativa contra `014e7e5` encontró cuatro regresiones reales: alertas que dependen de Realtime sin fallback ni verificación de publication, notificaciones de navegador eliminadas, una demo que no puede abrir el flujo de emergencia y pérdidas menores de navegación/microcopy. Este bloque las restaura sin debilitar full mode ni presentar datos demo como oficiales.

## Scope
### In
- Fallback acotado de alertas, estado observable del canal y health check de las cuatro tablas Realtime.
- Notificaciones de navegador con activación explícita y callers para chat/comunidad.
- Acceso de operador solo en demo, manteniendo roles y RPC/RLS en modo completo.
- Street View por coordenadas, ayuda de teléfono chileno y saludo de sesión.
- Tests, documentación operativa y corrección de los cuatro informes comparativos.

### Out
- No se ejecuta `scripts/init.sql` contra un proyecto remoto ni se hace deploy.
- No se implementa Storage; los adjuntos actuales continúan siendo data URLs temporales.
- No se convierte la demo en identidad operator real ni se modifica la autoridad de Supabase.
- No se restauran pérdidas intencionales no relacionadas, como clasificación de sentimiento.

## Approach
Mantener la arquitectura actual: `AlertProvider` coordina lectura/fallback,
`doctor` consulta un RPC de salud de solo booleanos y `init.sql` permanece
idempotente. El fallback será una actualización de seguridad de 30 segundos con
deduplicación, no polling agresivo de 5 segundos. Las notificaciones pedirán
permiso solo desde un control visible y fallarán cerrado en SSR, pestaña visible
o permiso no concedido.

## Constitution Alignment
| Principle | Aligned? | Notes |
|---|---|---|
| Verificación antes de afirmar | ✅ | Cada regresión tendrá test y se ejecutarán gates frescos. |
| Seguridad por capas | ✅ | El bypass existe solo en demo; full mode conserva rol, RPC y RLS. |
| Cambios mínimos y trazables | ✅ | Se reutilizan contextos/componentes y se registra SDD por path. |

## Rationale
| Alternative | Why Rejected |
|---|---|
| Restaurar polling de 5 s permanente | Sobrecarga innecesaria; el heartbeat acotado cubre silencio sin volver al patrón anterior. |
| Pedir permiso de notificaciones al montar | Es invasivo y no expresa consentimiento explícito. |
| Tratar al usuario demo como `operator` | Mezcla simulación con autorización; el bypass se limita a `demoMode`. |

## Affected Areas
`contexts/alert-context.tsx`, `components/volcano-status-header.tsx`,
`scripts/init.sql`, `scripts/doctor.ts`, `lib/browser-notifications.ts`,
`components/notification-toggle.tsx`, `app/page.tsx`,
`components/community-panel.tsx`, `components/chat-component.tsx`,
`components/interactive-map.tsx`, `components/login-screen.tsx`, README/TESTING,
los cuatro informes en `audit/` y tests Vitest en `__tests__/`.

## References
- [Google Maps URLs — Street View panorama](https://developers.google.com/maps/documentation/urls/get-started)
- `scripts/init.sql` y `scripts/doctor.ts` — contrato operativo Supabase.
