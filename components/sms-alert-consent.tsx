"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { APP_CONFIG } from "@/lib/app-config";
import { TERMS_VERSION } from "@/lib/legal";
import { supabase } from "@/lib/supabase";

export default function SmsAlertConsent() {
  const { usuario } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!usuario || !supabase || APP_CONFIG.demoMode) return;
    let mounted = true;
    void supabase
      .from("consentimientos")
      .select("aceptado")
      .eq("usuario_id", usuario.id)
      .eq("tipo", "alertas_sms")
      .order("fecha_decision", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) setEnabled(Boolean(data?.aceptado));
      });
    return () => {
      mounted = false;
    };
  }, [usuario]);

  const updateConsent = async () => {
    if (!usuario || !supabase || APP_CONFIG.demoMode) return;
    setLoading(true);
    setMessage("");
    const next = !enabled;
    const { error } = await supabase.from("consentimientos").upsert(
      {
        usuario_id: usuario.id,
        tipo: "alertas_sms",
        aceptado: next,
        version_terminos: TERMS_VERSION,
        fecha_decision: new Date().toISOString(),
        fecha_revocacion: next ? null : new Date().toISOString(),
      },
      { onConflict: "usuario_id,tipo,version_terminos" },
    );
    if (error) setMessage("No pudimos actualizar tu preferencia.");
    else {
      setEnabled(next);
      setMessage(next ? "Alertas SMS activadas." : "Baja de alertas SMS registrada.");
    }
    setLoading(false);
  };

  if (!usuario || APP_CONFIG.demoMode) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
      {enabled ? <BellRing className="size-3.5 text-primary" aria-hidden="true" /> : <BellOff className="size-3.5" aria-hidden="true" />}
      <span>{APP_CONFIG.smsAlertsEnabled ? "Alertas SMS proactivas" : "SMS proactivo aún no habilitado"}</span>
      <Button type="button" variant="ghost" size="sm" onClick={() => void updateConsent()} disabled={loading || !APP_CONFIG.smsAlertsEnabled} className="h-7 px-2 text-xs">
        {enabled ? "Dar de baja" : "Activar"}
      </Button>
      {message ? <span role="status">{message}</span> : null}
    </div>
  );
}
