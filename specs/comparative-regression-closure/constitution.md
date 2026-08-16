# Constitution — Vulcania

## Meta
- **Project:** Vulcania
- **Version:** 1.0.0
- **Ratified:** 2026-08-16
- **Last Amended:** 2026-08-16

## Core Principles
### I. Verificar antes de afirmar
**Statement:** Ningún cambio se declara listo sin evidencia fresca del runner y del diff.
**Rationale:** Evita claims falsos sobre tests, integraciones externas y deploy.
**Verification:** `pnpm test:run`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `git diff --check`.
**Non-Negotiable:** No afirmar una integración remota por evidencia local solamente.

### II. Seguridad por capas
**Statement:** La UI no otorga autoridad; Auth, RLS y RPC vuelven a validar full mode.
**Rationale:** Protege mutaciones operativas si el cliente es manipulado.
**Verification:** SQL contract, grants acotados y tests de rol.
**Non-Negotiable:** El bypass demo no puede aplicarse en full mode.

### III. Cambios mínimos y trazables
**Statement:** Reutilizar arquitectura existente y tocar solo módulos necesarios, con tests por comportamiento.
**Rationale:** Reduce superficie de regresión en datos externos y demo offline.
**Verification:** Revisión de diff, SDD con paths y cobertura de historias.
**Non-Negotiable:** No introducir dependencias o refactors especulativos.

### IV. Accesibilidad y comunicación honesta
**Statement:** Estados críticos, controles y simulaciones deben ser operables y distinguibles.
**Rationale:** El producto trata información sensible y no debe confundir demo con autoridad.
**Verification:** Testing Library, roles/labels, provenance y reduced-motion.
**Non-Negotiable:** Nunca presentar datos demo como alerta oficial.

### V. Datos y operaciones fail-closed
**Statement:** Ante configuración o permisos faltantes, fallar con mensaje accionable sin inventar persistencia.
**Rationale:** Separa demo, instalación parcial y producción.
**Verification:** doctor, `hasError`, validación UUID/coordenadas y tests de error.
**Non-Negotiable:** No imprimir secretos ni ocultar fallos de publication/RLS.

## Additional Constraints
### Security
RLS/RPC en full mode, no service role en cliente, no secrets/log dumps, validación de inputs externos.
### Performance
Safety refresh máximo cada 30 s, sin requests solapados; no polling agresivo.
### Accessibility
Semántica y teclado equivalente a WCAG 2.2 AA en superficies modificadas.
### Data Privacy
No PII en logs; notificaciones opt-in; imágenes temporales y limitadas a 2 MB.

## Development Workflow
### Quality Gates
1. `pnpm test:run` exit 0.
2. `pnpm lint` sin warnings.
3. `pnpm typecheck` y `pnpm build` exit 0.
4. `pnpm test:coverage` con reporte frente a 80/70/90 global.
5. `git diff --check`, actionlint y revisión de seguridad cuando aplique.
### Branch Strategy
Rama actual de trabajo; no crear/versionar sin autorización.
### Commit Convention
Conventional Commits si el usuario autoriza commit; sin atribución de IA.
