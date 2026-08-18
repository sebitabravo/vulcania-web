"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { APP_CONFIG } from "@/lib/app-config";
import { DEMO_USUARIO } from "@/lib/demo-data";
import { type LoginConsent } from "@/lib/legal";
import { isValidChileanMobile, normalizePhoneSpaces } from "@/lib/phone-utils";
import { supabase, type Usuario } from "@/lib/supabase";

interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  pendingPhone: string | null;
  authError: string | null;
  login: (telefono: string, consent?: LoginConsent) => Promise<boolean>;
  verifyOtp: (codigo: string) => Promise<boolean>;
  clearPendingOtp: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DEMO_STORAGE_KEY = "vulcania_demo_session";

function getDemoUser(telefono: string): Usuario {
  const normalized = normalizePhoneSpaces(telefono);
  if (normalized === normalizePhoneSpaces(APP_CONFIG.demoPhone)) {
    return { ...DEMO_USUARIO, telefono: normalized };
  }

  return {
    id: `demo-${normalized.replace(/\D/g, "")}`,
    nombre: `Visitante ${normalized.slice(-4)}`,
    telefono: normalized,
    rol: "user",
    fecha_creacion: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [pendingConsent, setPendingConsent] = useState<LoginConsent | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const persistConsents = useCallback(async (usuarioId: string, consent: LoginConsent): Promise<boolean> => {
    if (!supabase) return false;
    const rows = [
      { usuario_id: usuarioId, tipo: "autenticacion", aceptado: consent.auth, version_terminos: consent.termsVersion, fecha_revocacion: null },
      { usuario_id: usuarioId, tipo: "nombre_comunidad", aceptado: consent.communityName, version_terminos: consent.termsVersion, fecha_revocacion: consent.communityName ? null : new Date().toISOString() },
      { usuario_id: usuarioId, tipo: "alertas_sms", aceptado: consent.smsAlerts, version_terminos: consent.termsVersion, fecha_revocacion: consent.smsAlerts ? null : new Date().toISOString() },
    ];
    const { error } = await supabase.from("consentimientos").upsert(rows, { onConflict: "usuario_id,tipo,version_terminos" });
    return !error;
  }, []);

  const profileFromAuthUser = useCallback(
    async (authUser: { id: string; phone?: string; user_metadata?: Record<string, unknown> }) => {
      if (!supabase) return null;

      const { data } = await supabase
        .from("usuarios")
        .select("id, nombre, telefono, rol, fecha_creacion")
        .eq("id", authUser.id)
        .maybeSingle();

      if (data) return data as Usuario;

      // The SQL trigger normally creates this row. Keeping a read-only fallback
      // avoids a blank shell while the trigger/schema is being deployed.
      return {
        id: authUser.id,
        nombre:
          typeof authUser.user_metadata?.name === "string"
            ? authUser.user_metadata.name
            : "Usuario Vulcania",
        telefono: authUser.phone ?? "",
        rol: "user",
        fecha_creacion: new Date().toISOString(),
      } satisfies Usuario;
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      if (APP_CONFIG.demoMode) {
        let stored: string | null = null;
        try {
          stored = window.sessionStorage.getItem(DEMO_STORAGE_KEY);
        } catch {
          // Continue as a fresh local session when browser storage is blocked.
        }
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Usuario;
            if (parsed.id && parsed.telefono) setUsuario(parsed);
          } catch {
            try {
              window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
            } catch {
              // Ignore unavailable storage; the current session remains empty.
            }
          }
        }
        if (mounted) setLoading(false);
        return;
      }

      if (!supabase) {
        if (mounted) setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await profileFromAuthUser(session.user);
        if (mounted) setUsuario(profile);
      }
      if (mounted) setLoading(false);
    };

    void hydrate().catch(() => {
      if (mounted) {
        setAuthError("No se pudo restaurar la sesión. Intenta nuevamente.");
        setLoading(false);
      }
    });

    if (!APP_CONFIG.demoMode && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => {
          if (!mounted) return;
          if (!session?.user) {
            setUsuario(null);
            setLoading(false);
            return;
          }
          void profileFromAuthUser(session.user).then(setUsuario).catch(() => {
            setAuthError("No se pudo cargar tu perfil.");
          });
        }, 0);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [profileFromAuthUser]);

  const login = useCallback(async (telefono: string, consent?: LoginConsent): Promise<boolean> => {
    setAuthError(null);
    const validation = isValidChileanMobile(telefono);
    if (!validation.valid) {
      setAuthError(validation.message ?? "Número de teléfono inválido.");
      return false;
    }

    const normalized = normalizePhoneSpaces(telefono);
    if (APP_CONFIG.demoMode) {
      const demoUser = getDemoUser(normalized);
      setUsuario(demoUser);
      try {
        window.sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser));
      } catch {
        // Demo access remains usable for the current render without persistence.
      }
      return true;
    }

    if (!supabase) {
      setAuthError("El acceso completo requiere configurar Supabase.");
      return false;
    }

    if (!consent?.auth || !consent.adult || !consent.termsVersion) {
      setAuthError("Debes aceptar los términos, la política de privacidad y declarar que eres mayor de 18 años.");
      return false;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: {
        shouldCreateUser: true,
        data: {
          name: "Usuario Vulcania",
          consent_auth: consent.auth,
          consent_community_name: consent.communityName,
          consent_alertas_sms: consent.smsAlerts,
          mayor_edad: consent.adult,
          terms_version: consent.termsVersion,
        },
      },
    });

    if (error) {
      setAuthError("No se pudo enviar el código. Revisa el número e inténtalo otra vez.");
      return false;
    }

    setPendingPhone(normalized);
    setPendingConsent(consent);
    return true;
  }, []);

  const verifyOtp = useCallback(async (codigo: string): Promise<boolean> => {
    setAuthError(null);
    if (!supabase || !pendingPhone || !/^\d{6}$/.test(codigo.trim())) {
      setAuthError("Ingresa el código de 6 dígitos recibido por SMS.");
      return false;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: pendingPhone,
      token: codigo.trim(),
      type: "sms",
    });

    if (error || !data.user) {
      setAuthError("El código no es válido o ya expiró. Solicita uno nuevo.");
      return false;
    }

    const consent = pendingConsent;
    if (!consent) {
      setAuthError("Falta confirmar el consentimiento antes de entrar.");
      return false;
    }

    const consentSaved = await persistConsents(data.user.id, consent);
    if (!consentSaved) {
      await supabase.auth.signOut();
      setAuthError("No pudimos guardar tu consentimiento. No se abrió la sesión.");
      return false;
    }

    const profile = await profileFromAuthUser(data.user);
    setUsuario(profile);
    setPendingPhone(null);
    setPendingConsent(null);
    return true;
  }, [pendingConsent, pendingPhone, persistConsents, profileFromAuthUser]);

  const clearPendingOtp = useCallback(() => {
    setPendingPhone(null);
    setPendingConsent(null);
    setAuthError(null);
  }, []);

  const logout = useCallback(async () => {
    setUsuario(null);
    setPendingPhone(null);
    setPendingConsent(null);
    setAuthError(null);
    if (APP_CONFIG.demoMode) {
      try {
        window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {
        // Nothing else is required to clear the in-memory demo session.
      }
      return;
    }
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      usuario,
      loading,
      pendingPhone,
      authError,
      login,
      verifyOtp,
      clearPendingOtp,
      logout,
    }),
    [usuario, loading, pendingPhone, authError, login, verifyOtp, clearPendingOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
