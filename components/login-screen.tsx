"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mountain, Phone, ShieldCheck } from "lucide-react";
import { AlertLevelBadge } from "@/components/alert-level-badge";
import { useAlert } from "@/contexts/alert-context";
import VolcanoStatusHeader from "@/components/volcano-status-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { APP_CONFIG } from "@/lib/app-config";
import { formatTelefonoInput, isValidChileanMobile } from "@/lib/phone-utils";

export default function LoginScreen() {
  const [telefono, setTelefono] = useState("+56 9 ");
  const [codigo, setCodigo] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const { login, verifyOtp, pendingPhone, authError, clearPendingOtp } = useAuth();
  const { alerta } = useAlert();
  const isDemo = Boolean(APP_CONFIG.demoMode);

  const handlePhoneSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");
    const validation = isValidChileanMobile(telefono);
    if (!validation.valid) {
      setLocalError(validation.message ?? "Ingresa un número móvil chileno válido.");
      return;
    }

    setLoading(true);
    const success = await login(telefono);
    if (success && !isDemo) setStage("code");
    setLoading(false);
  };

  const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");
    setLoading(true);
    await verifyOtp(codigo);
    setLoading(false);
  };

  const resetOtp = () => {
    clearPendingOtp();
    setCodigo("");
    setStage("phone");
  };

  const errorMessage = localError || authError;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
              <Mountain className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">Vulcania</p>
              <p className="text-xs text-muted-foreground">Centro de monitoreo comunitario</p>
            </div>
          </div>
          {alerta ? <AlertLevelBadge level={alerta.nivel_alerta} showIcon={false} className="hidden sm:flex" /> : null}
        </div>
      </div>

      <div className="mb-8">
        <VolcanoStatusHeader />
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_440px] lg:items-center lg:px-8">
        <section className="hidden max-w-xl lg:block">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">Red local · La Araucanía</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-foreground xl:text-6xl">
            Información clara cuando más importa.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
            Consulta el estado técnico del Villarrica, encuentra un punto de encuentro y comparte información útil con tu comunidad.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              [ShieldCheck, "Fuente visible", "Cada dato muestra su origen."],
              [LockKeyhole, "Acceso seguro", "OTP real en modo completo."],
              [KeyRound, "Demo honesta", "Simulación rotulada y local."],
            ].map(([Icon, title, description]) => {
              const IconComponent = Icon as typeof ShieldCheck;
              return (
                <div key={title as string} className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <IconComponent className="size-5 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-foreground">{title as string}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{description as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        <Card className="border-border/80 bg-card/85 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur">
          <CardHeader className="space-y-3 p-6 pb-4 sm:p-8 sm:pb-5">
            <div className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary lg:hidden">
              <Mountain className="size-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl tracking-tight">{stage === "phone" ? "Ingresa a Vulcania" : "Verifica tu teléfono"}</CardTitle>
              <CardDescription className="mt-2 leading-6">
                {stage === "phone"
                  ? isDemo
                    ? "Estás viendo una demostración local. No se envía ningún SMS real."
                    : "Usaremos un código OTP de Supabase Auth. Nunca guardamos una sesión inventada."
                  : `Enviamos un código de 6 dígitos a ${pendingPhone || telefono}.`}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
            {stage === "phone" ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="telefono" className="text-sm font-medium text-foreground">Número móvil chileno</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="telefono"
                      type="tel"
                      inputMode="tel"
                      placeholder="+56 9 1234 5678"
                      value={telefono}
                      onChange={(event) => {
                        setTelefono(formatTelefonoInput(event.target.value, telefono));
                        setLocalError("");
                      }}
                      className="h-12 pl-10 font-mono text-base"
                      disabled={loading}
                      required
                      autoComplete="tel"
                      aria-describedby="telefono-help"
                    />
                  </div>
                  <p id="telefono-help" className="text-xs leading-5 text-muted-foreground">
                    Formato válido: +56 9 XXXX XXXX. El 9 se agrega automáticamente después de +56.
                  </p>
                </div>

                {errorMessage ? <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm leading-6 text-red-200">{errorMessage}</p> : null}

                <Button type="submit" disabled={loading} size="lg" className="h-12 w-full">
                  {loading ? "Validando…" : isDemo ? "Entrar al monitor demo" : "Enviar código seguro"}
                  {!loading ? <ArrowRight aria-hidden="true" /> : null}
                </Button>

                {isDemo ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-3 text-xs leading-5 text-muted-foreground">
                    <strong className="text-foreground">Modo portfolio:</strong> puedes usar cualquier móvil chileno válido. Los cambios de demo viven solo en esta sesión.
                  </div>
                ) : null}
              </form>
            ) : (
              <form onSubmit={handleCodeSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="codigo-otp" className="text-sm font-medium text-foreground">Código de verificación</label>
                  <Input
                    id="codigo-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={codigo}
                    onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 text-center font-mono text-xl tracking-[0.45em]"
                    disabled={loading}
                    required
                    aria-describedby="codigo-help"
                  />
                  <p id="codigo-help" className="text-xs leading-5 text-muted-foreground">El código expira según la configuración de Supabase Auth.</p>
                </div>
                {errorMessage ? <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm leading-6 text-red-200">{errorMessage}</p> : null}
                <Button type="submit" disabled={loading || codigo.length !== 6} size="lg" className="h-12 w-full">
                  {loading ? "Verificando…" : "Verificar y entrar"}
                  {!loading ? <ShieldCheck aria-hidden="true" /> : null}
                </Button>
                <Button type="button" variant="ghost" onClick={resetOtp} disabled={loading} className="w-full text-muted-foreground">
                  <ArrowLeft aria-hidden="true" /> Cambiar número
                </Button>
              </form>
            )}

            <div className="mt-6 flex items-start gap-2 border-t border-border/70 pt-5 text-xs leading-5 text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>La información oficial siempre debe contrastarse con SERNAGEOMIN, SENAPRED y las autoridades locales.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
