"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, MapPin, MessageSquareText, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { AlertLevelBadge } from "@/components/alert-level-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_CONFIG } from "@/lib/app-config";
import { ALERT_LEVELS, isAlertLevel, type AlertLevel } from "@/lib/alert-levels";
import { formatFreshness } from "@/lib/date-utils";
import { DEMO_PUNTOS_ENCUENTRO, getDemoAlert, setDemoAlertLevel } from "@/lib/demo-data";
import { supabase, type AvisoComunidad, type PuntoEncuentro } from "@/lib/supabase";

interface AdminPanelProps {
  onClose: () => void;
}

const PARAMETER_PRESETS: Record<AlertLevel, { sismos_24h: number; temperatura_crater: string; emision_so2: string; deformacion: string }> = {
  verde: { sismos_24h: 12, temperatura_crater: "650 °C", emision_so2: "400 ton/día", deformacion: "0,8 cm/mes" },
  amarillo: { sismos_24h: 45, temperatura_crater: "850 °C", emision_so2: "1.200 ton/día", deformacion: "2,3 cm/mes" },
  naranja: { sismos_24h: 84, temperatura_crater: "1.050 °C", emision_so2: "2.400 ton/día", deformacion: "4,8 cm/mes" },
  rojo: { sismos_24h: 140, temperatura_crater: "1.250 °C", emision_so2: "4.800 ton/día", deformacion: "7,5 cm/mes" },
};

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [currentLevel, setCurrentLevel] = useState<AlertLevel>("verde");
  const [points, setPoints] = useState<PuntoEncuentro[]>([]);
  const [messages, setMessages] = useState<AvisoComunidad[]>([]);
  const [pendingLevel, setPendingLevel] = useState<AlertLevel | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (APP_CONFIG.demoMode) {
        if (mounted) {
          setCurrentLevel(getDemoAlert().nivel_alerta);
          setPoints(DEMO_PUNTOS_ENCUENTRO);
          setLoading(false);
        }
        return;
      }
      if (!supabase) {
        if (mounted) {
          setError("Supabase no está configurado.");
          setLoading(false);
        }
        return;
      }
      const [{ data: alertData, error: alertError }, { data: pointData }, { data: messageData }] = await Promise.all([
        supabase.from("alertas_volcan").select("nivel_alerta").order("ultima_actualizacion", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("puntos_encuentro").select("*").order("nombre"),
        supabase.from("avisos_comunidad").select("id, usuario_id, autor_nombre, mensaje, fecha_creacion, estado").eq("estado", "activo").order("fecha_creacion", { ascending: false }).limit(12),
      ]);
      if (!mounted) return;
      if (alertError) setError("No pudimos cargar el estado operativo.");
      else if (alertData?.nivel_alerta && isAlertLevel(alertData.nivel_alerta)) setCurrentLevel(alertData.nivel_alerta);
      setPoints((pointData as PuntoEncuentro[]) || []);
      setMessages((messageData as AvisoComunidad[]) || []);
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const updateLevel = async () => {
    if (!pendingLevel) return;
    if (APP_CONFIG.demoReadOnly) {
      setError("El modo demo está configurado como solo lectura.");
      setPendingLevel(null);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (APP_CONFIG.demoMode) {
        setDemoAlertLevel(pendingLevel);
      } else {
        if (!supabase) throw new Error("Supabase no configurado");
        const { error: rpcError } = await supabase.rpc("cambiar_nivel_alerta", { nuevo_nivel: pendingLevel });
        if (rpcError) throw rpcError;
      }
      setCurrentLevel(pendingLevel);
      setStatus(`Nivel actualizado a ${ALERT_LEVELS[pendingLevel].label}.`);
    } catch {
      setError("No se pudo actualizar el nivel. Verifica tu rol de operador y la conexión.");
    } finally {
      setSaving(false);
      setPendingLevel(null);
    }
  };

  const updatePoint = async (point: PuntoEncuentro, occupied: boolean) => {
    if (APP_CONFIG.demoReadOnly) {
      setError("El modo demo está configurado como solo lectura.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (APP_CONFIG.demoMode) {
        setPoints((current) => current.map((item) => item.id === point.id ? { ...item, ocupado: occupied } : item));
      } else {
        if (!supabase) throw new Error("Supabase no configurado");
        const { error: rpcError } = await supabase.rpc("cambiar_estado_punto_encuentro", { punto_id: point.id, nuevo_estado: occupied });
        if (rpcError) throw rpcError;
      }
      setStatus(`${point.nombre}: ${occupied ? "marcado como lleno" : "marcado como disponible"}.`);
    } catch {
      setError("No se pudo actualizar el punto de encuentro.");
    } finally {
      setSaving(false);
    }
  };

  const resetPoints = async () => {
    if (APP_CONFIG.demoReadOnly) {
      setError("El modo demo está configurado como solo lectura.");
      return;
    }
    setSaving(true);
    try {
      if (APP_CONFIG.demoMode) setPoints((current) => current.map((point) => ({ ...point, ocupado: false })));
      else {
        if (!supabase) throw new Error("Supabase no configurado");
        const { error: rpcError } = await supabase.rpc("resetear_puntos_encuentro");
        if (rpcError) throw rpcError;
      }
      setStatus("Todos los puntos quedaron disponibles.");
    } catch {
      setError("No se pudieron resetear los puntos.");
    } finally {
      setSaving(false);
    }
  };

  const hideMessage = async () => {
    if (!pendingMessage || !supabase || APP_CONFIG.demoMode || APP_CONFIG.demoReadOnly) {
      setPendingMessage(null);
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.from("avisos_comunidad").update({ estado: "inactivo" }).eq("id", pendingMessage);
      if (updateError) throw updateError;
      setMessages((current) => current.filter((message) => message.id !== pendingMessage));
      setStatus("Reporte ocultado de la comunidad.");
    } catch {
      setError("No se pudo ocultar el reporte.");
    } finally {
      setPendingMessage(null);
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto bg-card text-foreground">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl"><Settings2 className="size-5 text-primary" aria-hidden="true" /> Consola de operador</DialogTitle>
          <DialogDescription>Las acciones sensibles se validan nuevamente en Supabase mediante RLS y RPC. Los parámetros de este prototipo quedan rotulados como simulación hasta conectarlos con una fuente operativa oficial.</DialogDescription>
        </DialogHeader>

        {APP_CONFIG.demoMode ? <p className="rounded-lg border border-primary/20 bg-primary/[0.06] p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Simulación demo:</strong> las acciones no generan una alerta oficial ni persisten fuera de esta pestaña.</p> : null}
        {APP_CONFIG.demoReadOnly ? <p className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-3 text-sm text-yellow-100">Modo solo lectura: las acciones están bloqueadas.</p> : null}
        {error ? <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
        {status ? <p role="status" className="rounded-lg border border-emerald-300/25 bg-emerald-300/[0.06] p-3 text-sm text-emerald-100">{status}</p> : null}

        {loading ? <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">Cargando consola…</div> : <div className="space-y-5">
          <Card className="border-border/80 bg-background/50">
            <CardHeader className="p-5 pb-3"><CardTitle className="flex items-center justify-between gap-3 font-display text-lg"><span className="flex items-center gap-2"><AlertTriangle className="size-4 text-orange-200" aria-hidden="true" /> Nivel operativo</span><AlertLevelBadge level={currentLevel} /></CardTitle></CardHeader>
            <CardContent className="grid gap-3 p-5 pt-2 sm:grid-cols-2">
              {(Object.keys(ALERT_LEVELS) as AlertLevel[]).map((level) => {
                const config = ALERT_LEVELS[level];
                const Icon = config.icon;
                return <Button key={level} type="button" variant={currentLevel === level ? "default" : "outline"} onClick={() => setPendingLevel(level)} disabled={saving || currentLevel === level || APP_CONFIG.demoReadOnly} className="h-auto min-h-16 justify-start gap-3 p-3 text-left"><Icon className="size-5 shrink-0" aria-hidden="true" /><span><span className="block font-semibold">{config.label}</span><span className="block text-xs font-normal opacity-75">{config.description}</span></span></Button>;
              })}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-background/50"><CardHeader className="p-5 pb-3"><CardTitle className="flex items-center gap-2 font-display text-lg"><MapPin className="size-4 text-primary" aria-hidden="true" /> Puntos de encuentro</CardTitle></CardHeader><CardContent className="space-y-3 p-5 pt-2"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{points.length} puntos cargados</span><Button type="button" variant="outline" size="sm" onClick={() => void resetPoints()} disabled={saving || APP_CONFIG.demoReadOnly}>Resetear disponibles</Button></div>{points.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Los puntos se cargan desde Supabase en modo completo.</p> : <div className="grid gap-2">{points.map((point) => <div key={point.id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{point.nombre}</p><p className="text-xs text-muted-foreground">Capacidad {point.capacidad} · {point.tiempo_aprox_pie} min a pie</p></div><Button type="button" size="sm" variant="outline" onClick={() => void updatePoint(point, !point.ocupado)} disabled={saving || APP_CONFIG.demoReadOnly} className={point.ocupado ? "text-emerald-200" : "text-red-200"}>{point.ocupado ? <><Check aria-hidden="true" /> Liberar</> : <><ShieldCheck aria-hidden="true" /> Marcar lleno</>}</Button></div>)}</div>}</CardContent></Card>

          {!APP_CONFIG.demoMode ? <Card className="border-border/80 bg-background/50"><CardHeader className="p-5 pb-3"><CardTitle className="flex items-center justify-between gap-3 font-display text-lg"><span className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" aria-hidden="true" /> Moderación reciente</span><span className="font-mono text-xs font-normal text-muted-foreground">{messages.length} reportes</span></CardTitle></CardHeader><CardContent className="space-y-2 p-5 pt-2">{messages.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No hay reportes pendientes.</p> : messages.map((message) => <div key={message.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/60 p-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{message.autor_nombre || "Vecino"}</span><span className="text-xs text-muted-foreground">{formatFreshness(message.fecha_creacion)}</span></div><p className="mt-1 truncate text-sm text-muted-foreground">{message.mensaje}</p></div><Button type="button" size="icon" variant="ghost" onClick={() => setPendingMessage(message.id)} disabled={saving || APP_CONFIG.demoReadOnly} aria-label={`Ocultar reporte de ${message.autor_nombre || "vecino"}`}><Trash2 className="size-4 text-red-200" aria-hidden="true" /></Button></div>)}</CardContent></Card> : null}

          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" /> Cada cambio de alerta queda auditado con actor, fecha, nivel anterior y nivel nuevo.</p>
        </div>}
      </DialogContent>

      <Dialog open={Boolean(pendingLevel)} onOpenChange={(open) => { if (!open) setPendingLevel(null); }}>
        <DialogContent className="bg-card text-foreground sm:max-w-md">
          <DialogHeader className="text-left"><DialogTitle className="font-display">Confirmar cambio operativo</DialogTitle><DialogDescription>{pendingLevel ? `Vas a emitir ${ALERT_LEVELS[pendingLevel].label}. Esta acción cambia el estado visible para la comunidad y queda auditada.` : ""}</DialogDescription></DialogHeader>
          {pendingLevel === "rojo" ? <p className="rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-sm leading-6 text-red-100">Confirma solo si existe un respaldo oficial (RAV/REAV) y una instrucción operativa vigente. La demo nunca representa una alerta real.</p> : null}
          {pendingLevel ? <div className="rounded-lg border border-border bg-background/50 p-4"><div className="flex items-center gap-3"><AlertLevelBadge level={pendingLevel} /><span className="text-sm text-muted-foreground">Parámetros deterministas: {PARAMETER_PRESETS[pendingLevel].sismos_24h} sismos/24h · {PARAMETER_PRESETS[pendingLevel].temperatura_crater}</span></div></div> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setPendingLevel(null)} disabled={saving}>Cancelar</Button><Button type="button" onClick={() => void updateLevel()} disabled={saving || APP_CONFIG.demoReadOnly}>{saving ? "Guardando…" : "Confirmar cambio"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingMessage)} onOpenChange={(open) => { if (!open) setPendingMessage(null); }}>
        <DialogContent className="bg-card text-foreground sm:max-w-md"><DialogHeader className="text-left"><DialogTitle className="font-display">Ocultar reporte</DialogTitle><DialogDescription>El reporte dejará de aparecer en la comunidad. La acción será visible en la auditoría.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setPendingMessage(null)} disabled={saving}>Cancelar</Button><Button type="button" variant="destructive" onClick={() => void hideMessage()} disabled={saving}>{saving ? "Ocultando…" : "Ocultar reporte"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </Dialog>
  );
}
