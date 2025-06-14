# VULCANIA - Sistema de Alertas Volcánicas 🌋

Sistema web para la prevención y evacuación ante alertas volcánicas, con mapa interactivo y comunicación comunitaria.

## 🚀 Despliegue Rápido en Vercel

### Paso 1: Configurar Variables de Entorno en Vercel

Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard) → Settings → Environment Variables y agrega:

**Variables OBLIGATORIAS:**
```
NEXT_PUBLIC_SUPABASE_URL = https://dlkmambmqjxgdlwobxrz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsa21hbWJtcWp4Z2Rsd29ieHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mjc2MjgsImV4cCI6MjA2NTUwMzYyOH0.0pZwKWdTdNOIlVntbvHS9COC1NtIOoImz5op-hTpO3A
```

**Variables OPCIONALES (para funcionalidades avanzadas):**
```
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsa21hbWJtcWp4Z2Rsd29ieHJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyNzYyOCwiZXhwIjoyMDY1NTAzNjI4fQ.7qsZTE670WKpJt9ErCpDHN_RNmiXQbxyOiyUetKnwUg
SUPABASE_JWT_SECRET = a9kUYWQa8EpbZTdO3/UEH4xMfHB/chcg5inxxxN6zGFXllnRiwS6YxdMmqPwIn8lO3KHmJqIXDR+M7wm4bzSbA==
```

### Paso 2: Desplegar

```bash
npm run deploy
```

O manualmente:
```bash
npm run build
vercel --prod
```

## 💻 Desarrollo Local

### Prerrequisitos
- Node.js 18+
- npm o pnpm
- Cuenta de Supabase

### Configuración Inicial

1. **Clonar y instalar dependencias:**
```bash
git clone <tu-repo>
cd vulcania-web
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL="https://dlkmambmqjxgdlwobxrz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu_anon_key_aqui"
SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key_aqui"
SUPABASE_JWT_SECRET="tu_jwt_secret_aqui"
```

3. **Validar configuración:**
```bash
npm run validate-env
```

4. **Inicializar base de datos:**
```bash
# Ejecutar script SQL en Supabase Dashboard
# Usar archivo: scripts/init.sql
```

5. **Ejecutar en desarrollo:**
```bash
npm run dev
```

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo con Turbopack
- `npm run build` - Construir para producción
- `npm run start` - Ejecutar build de producción
- `npm run lint` - Verificar código con ESLint
- `npm run validate-env` - Validar variables de entorno
- `npm run validate-env:vercel` - Mostrar ayuda para Vercel
- `npm run deploy` - Desplegar a Vercel con validaciones

## 🗄️ Base de Datos (Supabase)

### Tablas Principales
- `usuarios` - Información de usuarios registrados
- `puntos_encuentro` - Puntos de evacuación
- `rutas_evacuacion` - Rutas de escape
- `avisos_comunidad` - Mensajes comunitarios
- `alertas_volcan` - Niveles de alerta actual
- `informacion_volcan` - Datos de volcanes monitoreados

### Configuración RLS (Row Level Security)
Las políticas de seguridad están configuradas para:
- Permitir lectura pública de datos de alertas y puntos de encuentro
- Restringir escritura a usuarios autenticados
- Aislar mensajes privados entre usuarios

## 🗺️ Tecnologías Utilizadas

- **Frontend:** Next.js 15, React 19, TypeScript
- **Estilos:** Tailwind CSS, Radix UI
- **Mapas:** Leaflet con OpenStreetMap
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Despliegue:** Vercel

## 🚨 Troubleshooting

### Problema: Mapa no se renderiza en producción
**Solución:**
1. Verificar que las variables de entorno estén configuradas en Vercel
2. Revisar la consola del navegador para errores de Leaflet
3. Verificar que los recursos CSS de Leaflet se cargan correctamente

### Problema: Error de conexión con Supabase
**Solución:**
1. Ejecutar `npm run validate-env` para verificar configuración
2. Comprobar que las URLs y keys sean correctas
3. Verificar que las tablas existan en Supabase

### Problema: Build falla en Vercel
**Solución:**
1. Verificar que todas las variables de entorno estén configuradas
2. Comprobar que no hay errores de TypeScript en local
3. Revisar los logs de build en Vercel Dashboard

## 📝 Características

- ✅ Mapa interactivo con puntos de encuentro
- ✅ Sistema de alertas volcánicas en tiempo real
- ✅ Chat comunitario para coordinación
- ✅ Panel administrativo para gestión
- ✅ Rutas de evacuación visualizadas
- ✅ Autenticación de usuarios
- ✅ Responsive design
- ✅ Optimizado para producción

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

**Desarrollado para la comunidad de Pucón y alrededores del Volcán Villarrica** 🌋
