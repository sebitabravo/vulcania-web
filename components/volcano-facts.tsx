"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { AlertCircle, ExternalLink, MapPinned, Mountain } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_CONFIG } from "@/lib/app-config";
import { DEMO_VOLCAN_INFO } from "@/lib/demo-data";
import { formatLocalDateTime, isVerificationStale } from "@/lib/date-utils";
import { OFFICIAL_DISCLAIMER, OFFICIAL_SOURCES, isSafeHttpUrl } from "@/lib/official-sources";
import { supabase, type InformacionVolcan } from "@/lib/supabase";

export default function VolcanoFacts() {
  const [info, setInfo] = useState<InformacionVolcan | null>(APP_CONFIG.demoMode ? DEMO_VOLCAN_INFO : null);
  const [loading, setLoading] = useState(!APP_CONFIG.demoMode);
  const [error, setError] = useState("");

  useEffect(() => {
    if (APP_CONFIG.demoMode) return;
    let mounted = true;

    const load = async () => {
      if (!supabase) {
        if (mounted) {
          setError("La ficha oficial no está disponible sin Supabase.");
          setLoading(false);
        }
        return;
      }
      const { data, error: queryError } = await supabase
        .from("informacion_volcan")
        .select("*")
        .eq("codigo", "VIL")
        .maybeSingle();
      if (!mounted) return;
      if (queryError || !data) setError("No pudimos cargar la ficha del volcán.");
      else setInfo(data as InformacionVolcan);
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-7 sm:px-6 lg:px-8" aria-labelledby="volcano-facts-title">
      <Card className="border-border/70 bg-card/55">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-primary">Ficha técnica trazable</p>
              <h2 id="volcano-facts-title" className="mt-1 flex items-center gap-2 font-display text-xl font-semibold">
                <Mountain className="size-5 text-primary" aria-hidden="true" /> Villarrica
              </h2>
            </div>
            {APP_CONFIG.demoMode ? <Badge variant="outline" className="border-primary/30 text-primary">Referencia demo</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-1">
          {loading ? <div className="h-24 animate-shimmer rounded-lg bg-muted/50" aria-label="Cargando ficha del volcán" /> : null}
          {error ? <p role="status" className="flex items-center gap-2 rounded-lg border border-yellow-300/25 bg-yellow-300/[0.06] p-3 text-sm text-yellow-100"><AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}</p> : null}
          {info ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Fact label="Altitud" value={`${info.altura_msnm.toLocaleString("es-CL")} m s. n. m.`} />
                <Fact label="Coordenadas" value={`${info.latitud.toFixed(2)} / ${info.longitud.toFixed(2)}`} icon={<MapPinned className="size-3.5" aria-hidden="true" />} />
                <Fact label="Tipo" value={info.tipo_volcan || "Sin dato"} />
                <Fact label="Historial GVP" value={info.erupciones_registradas ? `${info.erupciones_registradas} periodos confirmados` : "Sin dato"} />
                <Fact label="Riesgos" value={info.riesgos_principales || "Sin dato"} />
              </div>
              <div className="flex flex-col gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <span>{info.descripcion}</span>
                <span>{info.ultima_verificacion ? `Verificado: ${formatLocalDateTime(info.ultima_verificacion)}` : "Fecha de verificación no disponible"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <span className="text-muted-foreground">Fuente: {info.fuente || "Fuente no declarada"}</span>
                {isSafeHttpUrl(info.fuente_url) ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={info.fuente_url} target="_blank" rel="noreferrer">Abrir fuente <ExternalLink className="size-3" aria-hidden="true" /></a> : null}
                {info.ultima_verificacion && isVerificationStale(info.ultima_verificacion) ? <span className="text-yellow-200">Ficha no verificada en los últimos 7 días</span> : null}
              </div>
            </>
          ) : null}
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
            <p className="font-medium text-foreground">Parámetros de monitoreo en tiempo real</p>
            <p className="mt-1 text-muted-foreground">Sin datos oficiales disponibles. Vulcania no inventa sismicidad, deformación ni SO₂.</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <span>{OFFICIAL_DISCLAIMER}</span>
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href={OFFICIAL_SOURCES.sernageominAlerts.url} target="_blank" rel="noreferrer">SERNAGEOMIN <ExternalLink className="size-3" aria-hidden="true" /></a>
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href={OFFICIAL_SOURCES.senapredVillarrica.url} target="_blank" rel="noreferrer">SENAPRED / SAE <ExternalLink className="size-3" aria-hidden="true" /></a>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Fact({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/35 p-3">
      <p className="flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
