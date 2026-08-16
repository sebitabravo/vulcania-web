"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { APP_CONFIG } from "@/lib/app-config";
import { createDemoAlert, getDemoAlert } from "@/lib/demo-data";
import { supabase, type AlertaVolcan } from "@/lib/supabase";

interface AlertContextValue {
  alerta: AlertaVolcan | null;
  loading: boolean;
  hasError: boolean;
  refresh: () => Promise<void>;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  // Keep the first render deterministic. sessionStorage is read after hydration
  // so a previously selected demo level cannot cause a server/client mismatch.
  const [alerta, setAlerta] = useState<AlertaVolcan | null>(() => (APP_CONFIG.demoMode ? createDemoAlert() : null));
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (APP_CONFIG.demoMode) {
      if (!mountedRef.current) return;
      setAlerta(getDemoAlert());
      setHasError(false);
      setLoading(false);
      return;
    }

    if (!supabase) {
      if (mountedRef.current) {
        setHasError(true);
        setLoading(false);
      }
      return;
    }

    const { data, error } = await supabase
      .from("alertas_volcan")
      .select("*, informacion_volcan(nombre)")
      .order("ultima_actualizacion", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!mountedRef.current) return;
    if (error || !data) {
      setHasError(true);
    } else {
      setAlerta(data as AlertaVolcan);
      setHasError(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const initialLoad = window.setTimeout(() => void refresh(), 0);

    const demoAlertListener = () => void refresh();
    if (APP_CONFIG.demoMode) {
      window.addEventListener("vulcania:demo-alert", demoAlertListener);
      return () => {
        mountedRef.current = false;
        window.clearTimeout(initialLoad);
        window.removeEventListener("vulcania:demo-alert", demoAlertListener);
      };
    }

    if (!supabase) {
      return () => {
        mountedRef.current = false;
        window.clearTimeout(initialLoad);
      };
    }

    const channel = supabase
      .channel("vulcania-alert-source")
      .on("postgres_changes", { event: "*", schema: "public", table: "alertas_volcan" }, () => void refresh())
      .subscribe();

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialLoad);
      void channel.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo(() => ({ alerta, loading, hasError, refresh }), [alerta, loading, hasError, refresh]);

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlert(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert debe usarse dentro de AlertProvider");
  return context;
}
