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
4. Re-ejecutar `scripts/init.sql` si hay errores de tabla/RLS
