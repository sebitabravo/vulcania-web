const toBoolean = (value: string | undefined, fallback = false): boolean => {
  if (typeof value === "undefined") return fallback;
  return value.toLowerCase() === "true";
};

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Si no hay variables de Supabase, activamos demo por defecto.
const demoMode = toBoolean(process.env.NEXT_PUBLIC_DEMO_MODE, !hasSupabaseEnv);
const demoReadOnly = toBoolean(
  process.env.NEXT_PUBLIC_DEMO_READONLY,
  demoMode
);

export const APP_CONFIG = {
  demoMode,
  demoReadOnly,
  demoPhone: process.env.NEXT_PUBLIC_DEMO_PHONE || "+56 9 8765 4321",
  enableAdminPanel: toBoolean(
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL,
    !demoMode
  ),
};
