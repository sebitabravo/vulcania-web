import { describe, expect, it, vi } from "vitest";

describe("lib/supabase", () => {
  it("valida UUIDs correctamente", async () => {
    vi.unmock("@/lib/supabase");
    const { isUuid } = await import("@/lib/supabase");

    expect(isUuid("a3b8f4d2-1c5e-4f7a-9b6c-2d8e0f1a3b4c")).toBe(true);
    expect(isUuid("")).toBe(false);
    expect(isUuid("no-es-uuid")).toBe(false);
    expect(isUuid("a3b8f4d2-1c5e-4f7a-9b6c")).toBe(false);
    // Versión 6+ o variant inválida se rechazan.
    expect(isUuid("a3b8f4d2-1c5e-6f7a-9b6c-2d8e0f1a3b4c")).toBe(false);
  });

  it("reporta no configurado cuando faltan las variables de Supabase", async () => {
    vi.unmock("@/lib/supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { isSupabaseConfigured } = await import("@/lib/supabase");

    expect(isSupabaseConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });
});
