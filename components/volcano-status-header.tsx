"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Clock3, Database, Radio } from "lucide-react";
import { AlertLevelBadge } from "@/components/alert-level-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAlert } from "@/contexts/alert-context";
import { APP_CONFIG } from "@/lib/app-config";
import { formatFreshness, formatLocalDateTime, isStale } from "@/lib/date-utils";
import { getAlertLevelConfig } from "@/lib/alert-levels";

export default function VolcanoStatusHeader() {
  const { alerta, loading, hasError, realtimeStatus } = useAlert();
  const [, setClock] = useState(0);

  useEffect(() => {
    const freshnessTimer = window.setInterval(() => setClock((value) => value + 1), 60_000);
    return () => window.clearInterval(freshnessTimer);
  }, []);

  if (loading) {
    return (
      <section className="border-y border-border/70 bg-card/70" aria-label="Cargando estado del volcán">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="h-36 animate-shimmer rounded-xl bg-muted/60" />
        </div>
      </section>
    );
  }

  if (!alerta) {
    return (
      <section className="border-y border-border/70 bg-card/70" aria-live="polite">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-5 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <AlertCircle className="size-5 text-yellow-300" aria-hidden="true" />
          <span>No pudimos actualizar el estado. Revisa los canales oficiales antes de actuar.</span>
        </div>
      </section>
    );
  }

  const config = getAlertLevelConfig(alerta.nivel_alerta);
  const LevelIcon = config.icon;
  const stale = isStale(alerta.ultima_actualizacion);
  const isSimulation = APP_CONFIG.demoMode || alerta.es_simulacion === true;
  const volcanoName = alerta.informacion_volcan?.nombre || APP_CONFIG.defaultVolcanoName || "Villarrica";

  return (
    <section
      className={`border-y border-border/70 ${config.panelClass}`}
      aria-live="polite"
      aria-label={`Estado del ${volcanoName}: ${config.label}`}
    >
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-6">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            <Radio className="size-3.5 text-emerald-300" aria-hidden="true" />
            <span>Estado operativo</span>
            <span className="text-border">/</span>
            <span>Monitoreo técnico</span>
            {isSimulation ? (
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                {APP_CONFIG.demoMode ? "Simulación demo" : "Simulación de instalación"}
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Volcán {volcanoName}
            </h2>
            <AlertLevelBadge level={alerta.nivel_alerta} />
          </div>

          <p className="mt-2 max-w-3xl text-base leading-7 text-foreground/85">
            {alerta.descripcion || config.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {formatFreshness(alerta.ultima_actualizacion)} · {formatLocalDateTime(alerta.ultima_actualizacion)} hora Chile
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="size-3.5" aria-hidden="true" />
              Fuente: {alerta.fuente || "Fuente no declarada"}
            </span>
            {alerta.referencia ? <span>Referencia: {alerta.referencia}</span> : null}
            {stale ? <span className="text-yellow-200">Información posiblemente desactualizada</span> : null}
            {hasError ? <span className="text-yellow-200">Última lectura disponible; no pudimos actualizar ahora.</span> : null}
            {!APP_CONFIG.demoMode && realtimeStatus && realtimeStatus !== "subscribed" ? (
              <span className="text-yellow-200">Canal en tiempo real no confirmado; reintentando cada 30 s.</span>
            ) : null}
          </div>
        </div>

        <Card className="border-border/70 bg-background/40 p-4 lg:min-w-64">
          <div className="flex items-start gap-3">
            <LevelIcon className={`mt-0.5 size-5 ${config.iconClass}`} aria-hidden="true" />
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">Qué hacer ahora</p>
              <p className="mt-1 text-sm leading-6 text-foreground">{config.action}</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
