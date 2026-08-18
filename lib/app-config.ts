export const toBoolean = (value: string | undefined, fallback = false): boolean => {
  if (typeof value === "undefined") return fallback;
  return value.toLowerCase() === "true";
};

export type RuntimeEnv = Record<string, string | undefined>;

export function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Mantener estos accesos directos permite que Next.js inlinee las variables
// NEXT_PUBLIC_* también en los bundles del cliente.
const runtimeEnv: RuntimeEnv = {
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEMO_READONLY: process.env.NEXT_PUBLIC_DEMO_READONLY,
};

export function hasSupabaseConfig(env: RuntimeEnv = runtimeEnv): boolean {
  return isValidHttpUrl(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function resolveDemoMode(env: RuntimeEnv = runtimeEnv): boolean {
  return toBoolean(env.NEXT_PUBLIC_DEMO_MODE, !hasSupabaseConfig(env));
}

export function resolveDemoReadOnly(env: RuntimeEnv = runtimeEnv): boolean {
  return toBoolean(env.NEXT_PUBLIC_DEMO_READONLY, false);
}

export const isDemoMode = resolveDemoMode();

// Si no hay variables de Supabase, activamos demo por defecto.
const demoReadOnly = resolveDemoReadOnly();

export const APP_CONFIG = {
  demoMode: isDemoMode,
  demoReadOnly,
  demoPhone: process.env.NEXT_PUBLIC_DEMO_PHONE || "+56 9 8765 4321",
  appName: "Vulcania",
  defaultVolcanoName: "Villarrica",
  enableAdminPanel: toBoolean(
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL,
    true
  ),
  smsAlertsEnabled: toBoolean(process.env.NEXT_PUBLIC_SMS_ALERTS_ENABLED, false),
};
