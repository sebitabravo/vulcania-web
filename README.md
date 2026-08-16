# Vulcania

Centro de monitoreo volcánico comunitario para Villarrica: estado técnico,
puntos de encuentro, reportes territoriales y coordinación vecinal.

Vulcania separa explícitamente dos capas:

- **Estado oficial:** en modo completo proviene de Supabase y debe cargarse con
  la fuente operativa que defina la organización. La interfaz muestra fuente,
  hora y frescura; no ingiere automáticamente datos de OVDAS/RNVV.
- **Capa comunitaria:** reportes y chat de vecinos. Nunca reemplaza una alerta
  oficial ni instrucciones de SENAPRED.
- **Zonas y mapa:** los radios de exclusión y puntos del demo son referenciales;
  el mapa siempre conserva una lista textual y enlaces de navegación.

## Stack

- Next.js 16 + React 19 + TypeScript strict
- Tailwind CSS + primitivas Radix/shadcn
- Supabase Auth, Postgres, RLS y Realtime en modo completo
- Leaflet 1.9.4 + Carto para cartografía
- Vitest + Testing Library + ESLint

## Modos de ejecución

### Demo offline

No requiere Supabase. Es una simulación local de portfolio: el estado inicial
es **Alerta Verde**, los datos se rotulan como demo y los avisos/mensajes se
mantienen en memoria mientras la pestaña está abierta.

```env
NEXT_PUBLIC_DEMO_MODE="true"
NEXT_PUBLIC_DEMO_READONLY="false"
NEXT_PUBLIC_DEMO_PHONE="+56 9 8765 4321"
NEXT_PUBLIC_ENABLE_ADMIN_PANEL="false"
```

El acceso demo valida el formato de teléfono chileno, pero no representa una
identidad real. No muestra un SMS ficticio ni crea una sesión Supabase.

### Modo completo con Supabase

Requiere un proyecto Supabase y el proveedor **Phone Auth** habilitado para
OTP por SMS.

```env
NEXT_PUBLIC_DEMO_MODE="false"
NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="TU_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
```

Las dos primeras variables se usan en el navegador. `SUPABASE_SERVICE_ROLE_KEY`
es solo para diagnósticos/operación local y nunca debe exponerse al cliente.
La sesión completa usa `signInWithOtp`/`verifyOtp`; no hay lookup de usuarios
ni sesión fabricada en `localStorage`.

## Inicio rápido

```bash
git clone https://github.com/tu-usuario/vulcania-web.git
cd vulcania-web
pnpm install
cp .env.example .env.local
# edita .env.local
pnpm dev
```

App local: <http://localhost:3000>

Si no defines Supabase, usa explícitamente `NEXT_PUBLIC_DEMO_MODE=true` para
evitar ambigüedad en CI y despliegues.

## Supabase desde cero

1. Crea un proyecto nuevo y habilita Phone Auth.
2. Ejecuta `scripts/init.sql` en el SQL Editor. El script crea el esquema,
   triggers de perfil, RLS, RPCs administrativas, auditoría, publicación
   Realtime y un seed verde simulado.
3. Registra un usuario mediante OTP.
4. Asigna `rol = 'operator'` o `rol = 'admin'` únicamente desde un canal
   administrativo confiable. La UI no otorga permisos: las RPC y RLS vuelven a
   validar el rol en Supabase.
5. Ejecuta `pnpm run doctor` con `SUPABASE_SERVICE_ROLE_KEY` para revisar entidades
   y permisos sin imprimir secretos.

`scripts/init.sql` está pensado para una instalación limpia. Revisa cualquier
esquema existente antes de aplicarlo en un proyecto con datos.

## Scripts

```bash
pnpm dev               # desarrollo con Turbopack
pnpm lint              # ESLint
pnpm typecheck         # TypeScript sin emitir
pnpm test:run          # Vitest una vez
pnpm test:coverage     # cobertura V8
pnpm build             # build Next.js
pnpm validate-env      # validar variables sin imprimir valores
pnpm run doctor         # diagnóstico seguro de Supabase/demo
pnpm test-realtime     # smoke de Realtime; se omite en demo offline
pnpm run deploy            # gates locales; no despliega producción por defecto
pnpm run deploy -- --production # Vercel producción, solo con autorización explícita
```

El workflow `.github/workflows/ci.yml` repite los gates en cada pull request y
push a `main` con Node 22 y pnpm 10.10.0. `pnpm test:coverage` aplica el
baseline actual de cobertura (30% statements/lines, 60% branches, 70%
functions) y no incluye artefactos generados por Next.

Gate recomendado antes de entregar:

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm test:coverage && pnpm build
git diff --check
```

## Seguridad y límites del demo

- Nunca subas `.env*` con credenciales reales.
- Rota claves si sospechas exposición; la anon key no reemplaza RLS.
- El modo demo no es un canal de emergencia ni una fuente científica.
- Contrasta siempre el nivel operativo y las instrucciones con SERNAGEOMIN,
  SENAPRED y autoridades locales.
- Las imágenes comunitarias están limitadas a 2 MB y se transportan como data
  URL temporal; para producción se debe migrar a Supabase Storage.
- El mapa conserva una lista textual accesible y enlaces externos de navegación;
  la cartografía no sustituye el plan de evacuación local.

## Documentación

- `DESIGN.md`: sistema visual y reglas de interacción.
- `TESTING.md`: estrategia y comandos de verificación.
- `SUPPORT.md`: checklist operativo.
- `audit/`: evidencia de la auditoría previa.
- `specs/vulcania-confidence-redesign/`: requisitos, diseño, tareas y gates de
  esta implementación.

## Licencia

MIT
