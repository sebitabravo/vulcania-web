# 🌋 Vulcania

Plataforma web para monitoreo volcánico comunitario (estado de alerta, mapa, comunidad y chat).

---

## ¿Qué incluye?

- Estado del volcán en tiempo real (verde/amarillo/naranja/rojo)
- Mapa de puntos de encuentro
- Comunidad (avisos)
- Chat entre usuarios
- Notificaciones de navegador
- Envío de imágenes en mensajes (modo demo y modo completo)
- Panel de administración (según configuración)

---

## Stack

- Next.js 15 + TypeScript
- Tailwind + shadcn/ui
- Supabase (opcional, para modo completo)
- Vercel (deploy)

---

## Modos de ejecución

### 1) Modo Demo (recomendado para mostrar el proyecto)
No requiere Supabase.

```env
NEXT_PUBLIC_DEMO_MODE="true"
NEXT_PUBLIC_DEMO_READONLY="false"
NEXT_PUBLIC_DEMO_PHONE="+56 9 8765 4321"
NEXT_PUBLIC_ENABLE_ADMIN_PANEL="false"
```

Qué tendrás en demo:
- login demo
- mapa demo
- chat/comunidad demo
- notificaciones
- imágenes en mensajes (demo)

> Nota: en demo no hay persistencia real entre usuarios/dispositivos.

---

### 2) Modo Completo (con Supabase)
Requiere proyecto Supabase configurado.

```env
NEXT_PUBLIC_DEMO_MODE="false"
NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="TU_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
SUPABASE_JWT_SECRET="TU_JWT_SECRET"
```

Luego ejecuta SQL inicial:
- `scripts/init.sql`

---

## Inicio rápido

```bash
git clone https://github.com/tu-usuario/vulcania-web.git
cd vulcania-web
pnpm install
cp .env.example .env.local
# edita .env.local
pnpm dev
```

App en: `http://localhost:3000`

---

## Scripts principales

```bash
pnpm dev               # desarrollo
pnpm build             # build producción
pnpm start             # ejecutar build
pnpm lint              # lint
pnpm test:run          # tests
pnpm test:coverage     # cobertura
pnpm validate-env      # validar variables
pnpm doctor            # diagnóstico app/supabase
```

---

## Seguridad (importante)

- Nunca subas `.env*` con claves reales.
- Si usas Supabase, genera tus propias credenciales.
- Si sospechas exposición de llaves: rota credenciales inmediatamente.

---

## Soporte mínimo

Revisa `SUPPORT.md` para el checklist semanal/mensual y manejo de incidentes.

---

## Roadmap corto

- (Opcional) migrar imágenes a Supabase Storage en modo completo
- (Opcional) agregar E2E tests para mapa/chat
- (Opcional) integrar observabilidad externa (ej: Sentry)

---

## Licencia

MIT
