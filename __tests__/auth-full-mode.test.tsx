/**
 * Contrato del flujo Supabase Auth en modo completo sin depender de un proyecto
 * externo ni de credenciales reales.
 *
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("AuthProvider full mode", () => {
  it("solicita OTP, verifica el código y no crea una sesión en localStorage", async () => {
    vi.resetModules();

    const signInWithOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
    const verifyOtp = vi.fn().mockResolvedValue({
      data: { user: { id: "11111111-1111-4111-8111-111111111111", phone: "+56912345678" } },
      error: null,
    });
    const profile = {
      id: "11111111-1111-4111-8111-111111111111",
      nombre: "Usuario verificado",
      telefono: "+56912345678",
      rol: "user",
      fecha_creacion: "2026-08-16T12:00:00.000Z",
    };
    const profileQuery = {
      select: vi.fn(() => profileQuery),
      eq: vi.fn(() => profileQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
    };
    const consentQuery = {
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithOtp,
        verifyOtp,
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn((table: string) => table === "consentimientos" ? consentQuery : profileQuery),
    };

    vi.doMock("@/lib/app-config", () => ({
      APP_CONFIG: {
        demoMode: false,
        demoReadOnly: false,
        demoPhone: "+56 9 8765 4321",
        appName: "Vulcania",
        defaultVolcanoName: "Villarrica",
        enableAdminPanel: true,
      },
    }));
    vi.doMock("@/lib/supabase", () => ({
      supabase,
      isSupabaseConfigured: () => true,
    }));

    const { AuthProvider, useAuth } = await import("@/contexts/auth-context");
    const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const consent = { auth: true as const, communityName: false, smsAlerts: false, adult: true as const, termsVersion: "2026-08-16" };
    await act(async () => {
      expect(await result.current.login("+56 9 1234 5678", consent)).toBe(true);
    });

    expect(signInWithOtp).toHaveBeenCalledWith({
      phone: "+56912345678",
      options: {
        shouldCreateUser: true,
        data: {
          name: "Usuario Vulcania",
          consent_auth: true,
          consent_community_name: false,
          consent_alertas_sms: false,
          mayor_edad: true,
          terms_version: "2026-08-16",
        },
      },
    });
    expect(result.current.pendingPhone).toBe("+56912345678");
    expect(window.localStorage.getItem("vulcania_usuario")).toBeNull();

    await act(async () => {
      expect(await result.current.verifyOtp("123456")).toBe(true);
    });

    expect(verifyOtp).toHaveBeenCalledWith({
      phone: "+56912345678",
      token: "123456",
      type: "sms",
    });
    expect(consentQuery.upsert).toHaveBeenCalledOnce();
    expect(result.current.usuario).toMatchObject({ id: profile.id, nombre: profile.nombre });
    expect(result.current.pendingPhone).toBeNull();
    expect(profileQuery.maybeSingle).toHaveBeenCalledOnce();
  });
});
