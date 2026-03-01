# Soporte mínimo recomendado

## Semanal (5-10 min)

```bash
pnpm lint
pnpm test:run
pnpm build
```

## Mensual (15-20 min)

```bash
pnpm validate-env
pnpm doctor
pnpm outdated
```

## Incidentes rápidos

1. `pnpm validate-env`
2. `pnpm doctor`
3. Revisar variables en Vercel/Supabase
4. Re-ejecutar `scripts/init.sql` si hay errores de tabla/RLS
