# Testing — Vulcania Web

La suite usa Vitest, Testing Library y `jsdom`. El proyecto no declara un
runner E2E autenticado: ese gate requiere un proyecto Supabase de prueba y
credenciales entregadas explícitamente.

## Instalación y gates

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test:run
pnpm test:coverage
pnpm build
git diff --check
```

Para una ejecución rápida durante desarrollo:

```bash
pnpm test
```

Para cobertura:

```bash
pnpm test:coverage
```

La cobertura usa V8, excluye `.next/`, `coverage/`, scripts y tests, y exige el
floor global de 80% de statements/lines, 70% de branches y 90% de functions.
Es un gate de código local, no evidencia de cobertura E2E contra Supabase.

## Suite actual

```text
__tests__/
├── setup.ts                # matchers, mocks mínimos y variables de test
├── app-config.test.ts      # defaults y flags de configuración
├── alert-levels.test.ts    # escala, iconos y fail-closed
├── auth-context.test.tsx   # contratos de auth/configuración
├── auth-full-mode.test.tsx # OTP full-mode con Supabase mockeado
├── auth-utils.test.ts      # helpers de teléfono importados desde lib/
├── button.test.tsx         # primitiva UI
├── login-screen.test.tsx   # render, accesibilidad y formato de teléfono
├── emergency-modal.test.tsx # modal única, contactos y acknowledgement
├── date-utils.test.ts      # frescura, stale y formatos locales
├── demo-data.test.ts       # alerta y stores demo entre pestañas
├── community-chat.test.tsx # publicación demo y envío con Enter
├── message-media.test.ts   # límite y parseo seguro de imágenes
├── phone-utils.test.ts     # validación canónica +569XXXXXXXX
├── schema-contract.test.ts  # RLS, policies, Realtime y guardas SQL
└── utils.test.ts           # cn y utilidades base
```

Los tests de componente deben preferir roles, labels y texto semántico. Evita
selectores ligados a clases Tailwind o a una copia local de la lógica de
producción.

## Demo y Supabase

El smoke de Realtime distingue los dos modos:

```bash
NEXT_PUBLIC_DEMO_MODE=true pnpm test-realtime
```

En demo el comando termina explícitamente como omitido. En modo completo
requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, se
suscribe a `alertas_volcan` y falla si Supabase no confirma la suscripción en
8 segundos.

El diagnóstico seguro del esquema usa:

```bash
NEXT_PUBLIC_DEMO_MODE=true pnpm run doctor
# o, en full mode, agrega las variables Supabase sin imprimirlas
pnpm run doctor
```

`doctor` no imprime claves. Las lecturas protegidas sin service role que
devuelven RLS se reportan como protección esperada; para revisar todas las
entidades usa un service role solo en el entorno administrativo adecuado.
En modo completo, el doctor verifica además el RPC
`verificar_publicaciones_realtime()` y las cuatro tablas de
`supabase_realtime`; si el health check falla en una instalación existente,
ejecuta nuevamente `scripts/init.sql` en el SQL Editor y repite el doctor. La
demo puede habilitar el panel de operador para demostrar el flujo crítico,
siempre rotulado como simulación.

El workflow de GitHub ejecuta install frozen, lint, typecheck, tests, coverage y
build en Node 22/pnpm 10.10.0.

## Reglas para cambios

1. Un bug o cambio de comportamiento necesita una regresión en `__tests__/`
   cuando exista un camino razonable.
2. Para inputs de teléfono usa `lib/phone-utils.ts`; el formato válido es
   `+569` seguido de exactamente ocho dígitos.
3. Para niveles usa `lib/alert-levels.ts`; no dupliques colores o labels.
4. Para imágenes usa `validateImageFile` y el límite de 2 MB.
5. Para teclado usa `onKeyDown` con guard de composición IME; `Enter` publica
   y `Shift+Enter` conserva saltos de línea cuando corresponde.
6. No uses `alert()`/`confirm()` nativos, `Math.random()` para datos operativos,
   HTML interpolado con datos de usuario ni logs con PII.

## Límites conocidos

- No hay E2E autenticado contra un proyecto Supabase real en este checkout.
- La demo no prueba RLS, OTP, RPCs ni entrega externa de SMS.
- La imagen comunitaria usa data URL temporal; Storage es el siguiente paso
  para un despliegue real.
