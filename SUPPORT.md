# Soporte mínimo recomendado

## Semanal (5-10 min)

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm test:coverage
pnpm build
```

## Mensual (15-20 min)

```bash
pnpm validate-env
pnpm run doctor
pnpm outdated
```

## Incidentes rápidos

1. `pnpm validate-env`
2. `pnpm run doctor`
3. Revisar variables en Vercel/Supabase
4. Re-ejecutar `scripts/init.sql` si hay errores de tabla/RLS o si `doctor` reporta
   una publication Realtime ausente
5. Repetir `pnpm run doctor` y `pnpm test-realtime` en el proyecto objetivo antes
   de publicar; los tests locales no demuestran la configuración remota

## Notificaciones y demo

- Las notificaciones de navegador se activan desde el botón de campana; no se
  solicita permiso automáticamente.
- La consola de operador demo es local y muestra `Simulación demo`. Nunca se
  debe interpretar como autoridad ni sustituye la validación de RLS/RPC.
