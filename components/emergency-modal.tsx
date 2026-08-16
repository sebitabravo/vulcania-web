"use client";

import { useEffect, useRef, useState } from "react";
import { BellOff, ExternalLink, Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertLevelBadge } from "@/components/alert-level-badge";
import { useAlert } from "@/contexts/alert-context";
import { APP_CONFIG } from "@/lib/app-config";
import { setupAudioUnlock } from "@/lib/audio-unlock";
import { EMERGENCY_CONTACTS, EMERGENCY_CONTACTS_SOURCE } from "@/lib/emergency-contacts";
import { getAlertLevelConfig, isCriticalAlert } from "@/lib/alert-levels";
import { startAlertSound, stopAlertSound } from "@/lib/alert-sound";
import { formatLocalDateTime } from "@/lib/date-utils";
import type { AlertaVolcan } from "@/lib/supabase";

const SOUND_KEY = "vulcania-alert-sound";

function getInitialSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(SOUND_KEY);
  } catch {
    // Fall back to the accessibility preference when storage is unavailable.
  }
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return stored ? stored === "on" : !reducedMotion;
}

function alertKey(alert: AlertaVolcan): string {
  return `${alert.id}:${alert.ultima_actualizacion}:${alert.nivel_alerta}`;
}

export default function EmergencyModal() {
  const { alerta } = useAlert();
  const [currentAlert, setCurrentAlert] = useState<AlertaVolcan | null>(null);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(getInitialSoundEnabled);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const acknowledgeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setupAudioUnlock(), []);

  useEffect(() => {
    const handleAlert = (alert: AlertaVolcan | null) => {
      if (!alert || !isCriticalAlert(alert.nivel_alerta)) {
        activeKeyRef.current = null;
        setCurrentAlert(null);
        setOpen(false);
        stopAlertSound();
        return;
      }

      const nextKey = alertKey(alert);
      const isNew = activeKeyRef.current !== nextKey;
      activeKeyRef.current = nextKey;
      setCurrentAlert(alert);
      if (isNew) {
        setDismissedKey(null);
        setOpen(true);
      } else if (dismissedKey !== nextKey) {
        setOpen(true);
      }
    };
    handleAlert(alerta);
  }, [alerta, dismissedKey]);

  useEffect(() => {
    if (!open || !currentAlert || !isCriticalAlert(currentAlert.nivel_alerta) || !soundEnabled) {
      stopAlertSound();
      return;
    }
    return startAlertSound(currentAlert.nivel_alerta);
  }, [currentAlert, open, soundEnabled]);

  const acknowledge = () => {
    if (currentAlert) setDismissedKey(alertKey(currentAlert));
    setOpen(false);
    stopAlertSound();
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // The mute choice remains active for the current render.
    }
    if (!next) stopAlertSound();
  };

  if (!currentAlert || !isCriticalAlert(currentAlert.nivel_alerta)) return null;

  const isRed = currentAlert.nivel_alerta === "rojo";
  const levelConfig = getAlertLevelConfig(currentAlert.nivel_alerta);
  const LevelIcon = levelConfig.icon;
  const volcanoName = currentAlert.informacion_volcan?.nombre || APP_CONFIG.defaultVolcanoName || "Villarrica";
  const isSimulation = APP_CONFIG.demoMode || currentAlert.es_simulacion === true;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : acknowledge())}>
      <DialogContent
        role="alertdialog"
        aria-modal="true"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          acknowledgeButtonRef.current?.focus();
        }}
        className="max-h-[92vh] overflow-y-auto border-red-400/50 bg-[#160c0f] p-0 text-red-50 shadow-[0_24px_100px_rgba(239,68,68,0.25)] sm:max-w-xl"
      >
        <div className="status-stripes border-b border-red-300/30 px-6 py-7 sm:px-8">
          <DialogHeader className="text-left">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-red-200/30 bg-red-400/20 p-3 text-red-100">
                  <LevelIcon className="size-7" aria-hidden="true" />
                </div>
                <div>
                  <DialogTitle className="font-display text-2xl text-red-50 sm:text-3xl">
                    {levelConfig.label} volcánica
                  </DialogTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AlertLevelBadge level={currentAlert.nivel_alerta} />
                    {isSimulation ? <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-1 text-[0.68rem] font-medium text-primary">{APP_CONFIG.demoMode ? "Simulación demo" : "Simulación de instalación"}</span> : null}
                    <span className="text-xs text-red-100/70">Volcán {volcanoName}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <DialogDescription className="text-base leading-7 text-red-50/90">
            {currentAlert.descripcion}
          </DialogDescription>

          <div className="rounded-xl border border-red-300/30 bg-red-400/10 p-4">
            <p className="font-display text-lg font-semibold text-red-50">
              {isRed ? "Sigue las instrucciones de evacuación." : "Prepárate para una posible evacuación."}
            </p>
            <p className="mt-1 text-sm leading-6 text-red-100/75">
              Confirma tu ruta, mantén comunicación con tu familia y usa solo información de canales oficiales.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-red-50">Números de emergencia</h3>
              <span className="text-xs text-red-100/60">Fuente: {EMERGENCY_CONTACTS_SOURCE}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {EMERGENCY_CONTACTS.map((contact) => (
                <a
                  key={contact.number}
                  href={contact.href}
                  className="rounded-lg border border-red-200/20 bg-black/20 p-3 transition-colors hover:bg-red-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                >
                  <span className="block font-mono text-xl font-semibold text-red-50">{contact.number}</span>
                  <span className="mt-1 block text-xs text-red-100/70">{contact.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-200/15 pt-4 text-xs text-red-100/60">
            <span>Actualizado: {formatLocalDateTime(currentAlert.ultima_actualizacion)} hora Chile · Fuente: {currentAlert.fuente || "No declarada"}</span>
            <button
              type="button"
              onClick={toggleSound}
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-red-100/80 hover:bg-red-200/10 hover:text-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? <Volume2 className="size-4" aria-hidden="true" /> : <BellOff className="size-4" aria-hidden="true" />}
              {soundEnabled ? "Silenciar alerta" : "Activar sonido"}
            </button>
          </div>
        </div>

        <DialogFooter className="flex-col border-t border-red-200/15 bg-black/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <a
            href="https://www.senapred.cl/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-red-100/75 underline-offset-4 hover:text-red-50 hover:underline"
          >
            Ver canales oficiales <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <Button ref={acknowledgeButtonRef} onClick={acknowledge} size="lg" className="w-full bg-red-500 text-white hover:bg-red-400 sm:w-auto">
            He leído y entiendo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
