# 🌋 VULCANIA - Monitoreo Volcán Villarrica

<div align="center">

![Vulcania](https://img.shields.io/badge/🌋-VULCANIA-red?style=for-the-badge)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat&logo=supabase)](https://supabase.com/)

**Plataforma web en tiempo real para el monitoreo y gestión de alertas del Volcán Villarrica**

*Desarrollada para la comunidad de Pucón y alrededores*

</div>

---

## 🎯 ¿Qué es VULCANIA?

VULCANIA es una aplicación web desarrollada específicamente para el monitoreo del **Volcán Villarrica** en Chile. Permite a las autoridades gestionar el estado de alerta volcánica y a la comunidad mantenerse informada y coordinada durante emergencias.

### 🏔️ Funcionalidades Principales

#### Para la Comunidad
- 📊 **Estado del Volcán en Tiempo Real** - Visualización del nivel de alerta actual (Verde, Amarillo, Naranja, Rojo)
- 🗺️ **Mapa Interactivo** - Puntos de encuentro y evacuación con navegación GPS
- 💬 **Foro Comunitario** - Espacio para compartir información y coordinar ayuda
- 🚨 **Alertas de Emergencia** - Modal automática con sonido cuando el volcán entra en estado crítico
- 📱 **Totalmente Responsiva** - Optimizada para usar en móviles durante emergencias

#### Para Administradores/Autoridades
- 🎛️ **Panel de Control** - Gestión del estado de alerta volcánica
- 📝 **Moderación** - Eliminación de mensajes inapropiados en el foro
- 📊 **Dashboard** - Monitoreo de la actividad de la plataforma

### 🚨 Sistema de Alertas

La aplicación maneja 4 niveles de alerta volcánica:

- 🟢 **Verde (Nivel 1)** - Estado normal
- 🟡 **Amarillo (Nivel 2)** - Cambios en la actividad
- 🟠 **Naranja (Nivel 3)** - Alerta temprana
- 🔴 **Rojo (Nivel 4)** - Evacuación inmediata

Cuando el volcán está en **Naranja o Rojo**, se activa automáticamente:
- Modal de emergencia con sonido de alerta
- Instrucciones específicas de evacuación
- Enlaces directos a puntos de encuentro

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **[Next.js 15](https://nextjs.org/)** - Framework React con SSR y App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático para JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utilitario
- **[Shadcn/ui](https://ui.shadcn.com/)** - Componentes UI accesibles
- **[Lucide React](https://lucide.dev/)** - Iconografía moderna

### Backend
- **[Supabase](https://supabase.com/)** - Base de datos PostgreSQL + Auth + Realtime
- **[Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)** - Seguridad a nivel de fila

### Deployment
- **[Vercel](https://vercel.com/)** - Hosting y CI/CD automático
- **[pnpm](https://pnpm.io/)** - Gestor de paquetes eficiente

---

## 🚨 ALERTA DE SEGURIDAD CRÍTICA

> **⚠️ IMPORTANTE**: Este repositorio anteriormente contenía claves de Supabase expuestas públicamente que fueron detectadas por GitHub Security. **TODAS ESAS CLAVES HAN SIDO INVALIDADAS.**

### 🔐 Acciones Requeridas ANTES de usar este proyecto:

1. **🔄 Generar nuevas credenciales** en Supabase Dashboard:
   - Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
   - Settings → API → "Reset" todas las claves
   - Genera nuevas Service Role Key y JWT Secret

2. **📝 Configurar variables de entorno** con las NUEVAS credenciales:
   - Copia `.env.example` como `.env.local`
   - Completa SOLO con las nuevas credenciales
   - ⚠️ **NUNCA** commites archivos `.env*` con claves reales

3. **🔒 Verificar .gitignore** contenga:
   ```
   .env
   .env.local
   .env.production
   ```

4. **🚀 En Vercel/Producción**: Actualiza todas las variables de entorno con las nuevas claves.

### ⚡ Estado del Proyecto
- ✅ Claves comprometidas removidas del código
- ✅ `.gitignore` configurado correctamente
- ✅ Puede funcionar en **modo demo offline** sin Supabase
- ⚠️ Para modo completo (persistencia/realtime), sí requiere credenciales nuevas

---

## ⚡ Inicio Rápido

### 📋 Prerrequisitos

- Node.js 18+
- pnpm (recomendado) o npm
- Cuenta en Supabase (solo si usarás modo completo)
- Proyecto configurado en Supabase (solo si usarás modo completo)

### 🧪 Modo Demo Sin Supabase (Recomendado si ya no usas Supabase)

Puedes ejecutar y desplegar la app sin Supabase:

```env
NEXT_PUBLIC_DEMO_MODE="true"
NEXT_PUBLIC_DEMO_READONLY="false"
NEXT_PUBLIC_DEMO_PHONE="+56 9 8765 4321"
NEXT_PUBLIC_ENABLE_ADMIN_PANEL="false"
```

Con esto tendrás:
- Login demo local
- Estado volcánico demo
- Mapa con puntos de encuentro demo
- Comunidad/chat demo (solo lectura si `NEXT_PUBLIC_DEMO_READONLY=true`)

No tendrás persistencia real ni realtime entre usuarios.

### 🛠️ Instalación

#### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/vulcania-web.git
cd vulcania-web
```

#### 2️⃣ Instalar Dependencias

```bash
pnpm install
```

#### 3️⃣ ⚠️ Configurar Variables de Entorno (CRÍTICO)

> **🚨 SEGURIDAD**: Las claves anteriores fueron comprometidas. DEBES generar nuevas credenciales.

##### Paso 1: Generar nuevas credenciales en Supabase
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Settings → API
4. **Reset/Regenera** todas las claves:
   - Project URL
   - Anon (public) key
   - Service Role (secret) key
   - JWT Secret

##### Paso 2: Configurar archivo de entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env.local
```

Edita `.env.local` con tus **NUEVAS** credenciales:

```env
# ⚠️ USA SOLO LAS NUEVAS CREDENCIALES GENERADAS
NEXT_PUBLIC_SUPABASE_URL="https://tu-nuevo-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu_nueva_anon_key_aqui"
SUPABASE_SERVICE_ROLE_KEY="tu_nueva_service_role_key_aqui"
SUPABASE_JWT_SECRET="tu_nuevo_jwt_secret_aqui"

# Demo (frontend)
NEXT_PUBLIC_DEMO_MODE="true"
NEXT_PUBLIC_DEMO_READONLY="true"
NEXT_PUBLIC_DEMO_PHONE="+56 9 0000 0000"
NEXT_PUBLIC_ENABLE_ADMIN_PANEL="false"
```

> **⚠️ IMPORTANTE**:
> - Nunca commites archivos `.env*` con claves reales
> - Usa diferentes claves para desarrollo y producción
> - Rota las claves periódicamente

#### 4️⃣ Configurar Base de Datos

1. Ve a tu proyecto Supabase
2. Abre el **SQL Editor**
3. Ejecuta el script completo que está en `scripts/init.sql`

Este script creará:
- Tablas de usuarios, volcán, puntos de encuentro, avisos
- Políticas de Row Level Security (RLS)
- Funciones y triggers necesarios

#### 5️⃣ Validar Configuración

```bash
pnpm run validate-env
```

#### 6️⃣ Ejecutar en Desarrollo

```bash
pnpm dev
```

🎉 **¡Listo!** La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

---

## 📊 Estructura de la Base de Datos

La aplicación utiliza las siguientes tablas principales:

### 📋 Tablas Principales

- **`usuarios`** - Información de usuarios registrados
- **`informacion_volcan`** - Estado actual del volcán (verde/amarillo/naranja/rojo)
- **`puntos_encuentro`** - Ubicaciones de evacuación con coordenadas GPS
- **`avisos_comunidad`** - Mensajes del foro comunitario
- **`alertas_emergencia`** - Historial de alertas críticas

### 🔐 Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- **Políticas específicas** por rol (usuario/admin)
- **Autenticación** vía Supabase Auth

---

## 🚀 Despliegue

### Vercel (Recomendado)

1. **Fork** este repositorio
2. Conecta tu cuenta de **Vercel** con GitHub
3. Importa el proyecto desde tu fork
4. Configura las **variables de entorno** en Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_JWT_SECRET
   ```
5. ¡Deploy automático! 🚀

### Variables de Entorno en Producción

⚠️ **CRÍTICO**: Usa credenciales DIFERENTES para producción:

```env
# Producción - Genera nuevas claves específicas
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto-prod.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="nueva_anon_key_produccion"
SUPABASE_SERVICE_ROLE_KEY="nueva_service_key_produccion"
SUPABASE_JWT_SECRET="nuevo_jwt_secret_produccion"
```

---

## 🎯 Cómo Usar la Aplicación

### 🎬 Modo Demo Recomendado (Portafolio)

Para una demo pública y estable:

1. Ejecuta `scripts/init.sql` completo en Supabase (incluye usuario `Demo` y data inicial).
2. Configura en Vercel:
   - `NEXT_PUBLIC_DEMO_MODE=true`
   - `NEXT_PUBLIC_DEMO_READONLY=true`
   - `NEXT_PUBLIC_DEMO_PHONE=+56 9 0000 0000`
   - `NEXT_PUBLIC_ENABLE_ADMIN_PANEL=false`
3. Mantén también:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Con esta configuración:
- Se permite navegar y visualizar información completa.
- Se bloquean acciones de escritura (foro/chat/admin) para no contaminar datos.
- El panel admin por atajo (`Ctrl+Shift+A`) queda deshabilitado.

### Para Usuarios Regulares

1. **Registro**: Ingresa tu nombre y teléfono
2. **Dashboard**: Ve el estado actual del volcán
3. **Mapa**: Explora puntos de encuentro cercanos
4. **Foro**: Comparte información con la comunidad
5. **Alertas**: Recibe notificaciones automáticas en emergencias

### Para Administradores

1. **Acceso Admin**: Click en el ícono de configuración (⚙️)
2. **Cambiar Estado**: Modifica el nivel de alerta del volcán
3. **Moderar**: Elimina mensajes inapropiados del foro
4. **Monitorear**: Supervisa la actividad de la plataforma

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
pnpm dev               # Inicia servidor de desarrollo
pnpm build             # Construye para producción
pnpm start             # Ejecuta versión de producción
pnpm lint              # Ejecuta ESLint

# Testing
pnpm test              # Vitest en watch mode
pnpm test:run          # Ejecuta tests una vez
pnpm test:coverage     # Ejecuta tests con cobertura

# Validación / Diagnóstico
pnpm validate-env      # Verifica variables de entorno
pnpm validate-env:vercel # Guía de variables para Vercel
pnpm doctor            # Diagnóstico automático Supabase + esquema
```

### 🩺 Diagnóstico Automático Recomendado

> Para soporte mínimo del proyecto, revisa también `SUPPORT.md`.

Antes de levantar el entorno productivo, ejecuta:

```bash
pnpm validate-env
pnpm doctor
```

Esto valida:
- credenciales y conectividad de Supabase,
- presencia de tablas requeridas,
- estado básico de permisos,
- estado de audio de alertas (auto-unlock habilitado).

### ⚡ Troubleshooting Rápido

- **Credenciales inválidas / conexión fallida**:
  - Ejecuta `pnpm validate-env` y luego `pnpm doctor`.
  - Si persiste, regenera claves en Supabase Dashboard → Settings → API.

- **Permisos/RLS**:
  - Ejecuta `scripts/init.sql` completo en Supabase SQL Editor.
  - Repite `pnpm doctor` para confirmar.

- **Sin sonido en alertas**:
  - Interactúa una vez con la página (click/tecla).
  - La app aplica auto-unlock de audio en el primer gesto del usuario.

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Por favor:

### 🐛 Reportar Bugs

Usa GitHub Issues para reportar bugs, incluyendo:
- Descripción detallada del problema
- Pasos para reproducir
- Screenshots si es relevante
- Información del navegador/dispositivo

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

## 🙋‍♂️ Contacto

- **Desarrollador**: Sebastian Bravo
- **GitHub**: [@sebitabravo](https://github.com/sebitabravo)

---
