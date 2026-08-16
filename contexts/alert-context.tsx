"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { APP_CONFIG } from "@/lib/app-config";
import { createDemoAlert, getDemoAlert } from "@/lib/demo-data";
import { supabase, type AlertaVolcan } from "@/lib/supabase";

export type RealtimeStatus = "idle" | "connecting" | "subscribed" | "channel_error" | "timed_out" | "closed";

interface AlertContextValue {
  alerta: AlertaVolcan | null;
  loading: boolean;
  hasError: boolean;
  realtimeStatus: RealtimeStatus;
  refresh: () => Promise<void>;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);
export const ALERT_FALLBACK_POLL_MS = 30_000;

function mapRealtimeStatus(status: string): RealtimeStatus {
  switch (status) {
    case "SUBSCRIBED":
      return "subscribed";
    case "CHANNEL_ERROR":
      return "channel_error";
    case "TIMED_OUT":
      return "timed_out";
    case "CLOSED":
      return "closed";
    default:
      return "connecting";
  }
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  // Keep the first render deterministic. sessionStorage is read after hydration
  // so a previously selected demo level cannot cause a server/client mismatch.
  const [alerta, setAlerta] = useState<AlertaVolcan | null>(() => (APP_CONFIG.demoMode ? createDemoAlert() : null));
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(
    APP_CONFIG.demoMode ? "idle" : supabase ? "connecting" : "channel_error"
  );
  const mountedRef = useRef(true);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const request = Promise.resolve().then(async () => {
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
        // Keep the last known alert. The header can then show stale/error
        // context instead of replacing a real reading with an empty state.
        setHasError(true);
      } else {
        setAlerta(data as AlertaVolcan);
        setHasError(false);
      }
      setLoading(false);
    }).finally(() => {
      if (refreshInFlightRef.current === request) refreshInFlightRef.current = null;
    });

    refreshInFlightRef.current = request;
    return request;
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
      .subscribe((status) => {
        if (mountedRef.current) setRealtimeStatus(mapRealtimeStatus(status));
      });
    const fallbackPoll = window.setInterval(() => void refresh(), ALERT_FALLBACK_POLL_MS);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialLoad);
      window.clearInterval(fallbackPoll);
      void channel.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ alerta, loading, hasError, realtimeStatus, refresh }),
    [alerta, loading, hasError, realtimeStatus, refresh]
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlert(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert debe usarse dentro de AlertProvider");
  return context;
}
