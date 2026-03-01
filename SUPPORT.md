# Soporte mínimo recomendado (Vulcania)

Objetivo: mantener la app estable con el menor esfuerzo operativo.

## Checklist semanal (5-10 min)

```bash
pnpm lint
pnpm test:run
pnpm build
```

## Checklist mensual (15-20 min)

```bash
pnpm validate-env
pnpm doctor
pnpm outdated
```

- Revisar deploy de Vercel y logs de runtime.
- Confirmar que alertas críticas (naranja/rojo) muestran modal y audio en navegador móvil.

## Incidentes (runbook rápido)

1. Validar entorno: `pnpm validate-env`
2. Diagnóstico DB/RLS: `pnpm doctor`
3. Si hay error de credenciales: regenerar claves en Supabase Dashboard (API) y actualizar variables en Vercel.
4. Si hay problemas de permisos: re-ejecutar `scripts/init.sql` completo.

## Criterio de “salud OK”

- Lint sin errores.
- Tests en verde.
- Build en verde.
- `pnpm doctor` sin errores en modo completo (o modo demo detectado correctamente).
