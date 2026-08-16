"use client";
/* User-selected data URLs are intentionally rendered without next/image. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Clock3, ImagePlus, MessageSquareText, Send, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { APP_CONFIG } from "@/lib/app-config";
import { addDemoCommunity, getDemoCommunity } from "@/lib/demo-data";
import { formatFreshness } from "@/lib/date-utils";
import { notify } from "@/lib/browser-notifications";
import { composeMessageWithImage, fileToDataUrl, parseMessageMedia, validateImageFile } from "@/lib/message-media";
import { isSupabaseConfigured, supabase, type AvisoComunidad } from "@/lib/supabase";

const MAX_MESSAGE_CHARS = 1_000;

export default function CommunityPanel() {
  const { usuario } = useAuth();
  const [avisos, setAvisos] = useState<AvisoComunidad[]>(() => (APP_CONFIG.demoMode ? getDemoCommunity() : []));
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const cargarAvisos = async () => {
      if (APP_CONFIG.demoMode) {
        if (mounted) {
          setAvisos(getDemoCommunity());
          setLoading(false);
        }
        return;
      }
      if (!supabase) {
        if (mounted) {
          setError("Base de datos no configurada. El demo offline está disponible desde el acceso inicial.");
          setLoading(false);
        }
        return;
      }
      const { data, error: queryError } = await supabase
        .from("avisos_comunidad")
        .select("id, usuario_id, autor_nombre, mensaje, fecha_creacion, estado")
        .eq("estado", "activo")
        .order("fecha_creacion", { ascending: false })
        .limit(30);
      if (!mounted) return;
      if (queryError) setError("No pudimos cargar los reportes. Reintenta en unos segundos.");
      else setAvisos((data as AvisoComunidad[]) || []);
      setLoading(false);
    };

    void cargarAvisos();
    if (APP_CONFIG.demoMode || !supabase) return () => { mounted = false; };

    const channel = supabase
      .channel("vulcania-community-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "avisos_comunidad" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const nextAviso = payload.new as AvisoComunidad;
          if (nextAviso.estado === "activo") {
            setAvisos((current) => [nextAviso, ...current.filter((aviso) => aviso.id !== nextAviso.id)].slice(0, 30));
            if (nextAviso.usuario_id !== usuario?.id) {
              notify("Nuevo aviso comunitario", {
                body: "Hay un nuevo reporte en tu comunidad.",
                tag: "community-feed",
              });
            }
          }
          return;
        }
        void cargarAvisos();
      })
      .subscribe();

    return () => {
      mounted = false;
      void channel.unsubscribe();
    };
  }, [usuario]);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.message ?? "No se pudo adjuntar la imagen.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(await fileToDataUrl(file));
  };

  const enviarAviso = async () => {
    if (APP_CONFIG.demoReadOnly) {
      setError("El modo demo está configurado como solo lectura.");
      return;
    }
    if (!usuario || (!nuevoMensaje.trim() && !imageFile)) {
      setError("Escribe un reporte o adjunta una imagen antes de enviar.");
      return;
    }
    if (!APP_CONFIG.demoMode && !supabase) {
      setError("No hay conexión con la base de datos.");
      return;
    }

    const originalText = nuevoMensaje.trim();
    const originalFile = imageFile;
    setEnviando(true);
    setError("");
    try {
      const imageUrl = originalFile ? await fileToDataUrl(originalFile) : undefined;
      const mensaje = composeMessageWithImage(originalText, imageUrl);
      if (APP_CONFIG.demoMode) {
        const aviso: AvisoComunidad = {
          id: `demo-aviso-${Date.now()}`,
          usuario_id: usuario.id,
          autor_nombre: usuario.nombre,
          mensaje,
          fecha_creacion: new Date().toISOString(),
          estado: "activo",
        };
        setAvisos(addDemoCommunity(aviso));
      } else if (supabase) {
        const { data, error: insertError } = await supabase
          .from("avisos_comunidad")
          .insert({ usuario_id: usuario.id, mensaje })
          .select("id, usuario_id, autor_nombre, mensaje, fecha_creacion, estado")
          .single();
        if (insertError || !data) throw insertError ?? new Error("No se recibió el reporte creado.");
        setAvisos((current) => [data as AvisoComunidad, ...current]);
      }
      setNuevoMensaje("");
      clearImage();
    } catch {
      setError("No se pudo enviar el reporte. Conservamos tu texto para reintentar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="space-y-6" aria-labelledby="community-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Capa comunitaria</p>
          <h2 id="community-title" className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
            Reportes del territorio
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Información vecinal contextualizada. No reemplaza una alerta oficial.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 border-border/80 bg-card/70 text-muted-foreground">
          <MessageSquareText className="size-3.5" aria-hidden="true" /> {avisos.length} reportes
        </Badge>
      </div>

      <Card className="border-border/80 bg-card/70">
        <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
          <CardTitle className="font-display text-lg">Comparte una observación</CardTitle>
          <CardDescription>Describe hechos concretos: lugar, hora y qué observaste.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-2 sm:p-6 sm:pt-2">
          {APP_CONFIG.demoMode ? <p className="rounded-lg border border-primary/20 bg-primary/[0.06] p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Simulación demo:</strong> tus reportes se guardan solo en memoria mientras esta pestaña está abierta.</p> : null}
          {APP_CONFIG.demoReadOnly ? <p className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-3 text-xs text-yellow-100">Modo demo solo lectura activado.</p> : null}
          <Textarea
            placeholder="Ej.: Ruta despejada en Pucón centro, 10:30."
            value={nuevoMensaje}
            maxLength={MAX_MESSAGE_CHARS}
            onChange={(event) => {
              setNuevoMensaje(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void enviarAviso();
              }
            }}
            className="min-h-28 resize-y bg-background/60"
            disabled={enviando || APP_CONFIG.demoReadOnly}
            aria-label="Texto del reporte comunitario"
          />

          {imagePreview ? (
            <div className="relative w-fit">
              <img src={imagePreview} alt="Vista previa del reporte" className="max-h-44 rounded-lg border border-border object-contain" />
              <button type="button" onClick={clearImage} aria-label="Quitar imagen" className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg hover:bg-muted">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background/60 px-3 text-sm text-muted-foreground hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                <ImagePlus className="size-4" aria-hidden="true" /> Adjuntar
                <input type="file" accept="image/*" className="sr-only" disabled={enviando || APP_CONFIG.demoReadOnly} onChange={(event) => { void handleImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
              <span className="font-mono text-xs text-muted-foreground">{nuevoMensaje.length}/{MAX_MESSAGE_CHARS}</span>
            </div>
            <Button type="button" onClick={() => void enviarAviso()} disabled={enviando || APP_CONFIG.demoReadOnly || (!nuevoMensaje.trim() && !imageFile)} className="min-h-11 sm:w-auto">
              <Send aria-hidden="true" /> {enviando ? "Publicando…" : "Publicar reporte"}
            </Button>
          </div>
          {error ? <p role="alert" className="text-sm leading-6 text-red-200">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? <div className="rounded-xl border border-border/70 bg-card/50 p-8 text-center text-sm text-muted-foreground">Cargando reportes…</div> : null}
        {!loading && !isSupabaseConfigured() && !APP_CONFIG.demoMode ? <div className="rounded-xl border border-yellow-300/25 bg-yellow-300/[0.06] p-6 text-center text-sm text-yellow-100">Configura Supabase para habilitar la comunidad persistente.</div> : null}
        {!loading && avisos.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center"><MessageSquareText className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 font-display font-semibold">Aún no hay reportes</p><p className="mt-1 text-sm text-muted-foreground">Comparte la primera observación útil para tu sector.</p></div> : null}
        {!loading && avisos.map((aviso) => {
          const { text, imageUrl } = parseMessageMedia(aviso.mensaje);
          const author = aviso.autor_nombre || aviso.usuarios?.nombre || "Vecino";
          return (
            <Card key={aviso.id} className="border-border/80 bg-card/60">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display font-semibold text-primary">{author.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{author}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3" aria-hidden="true" /> {formatFreshness(aviso.fecha_creacion)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 gap-1 border-border/80 text-xs text-muted-foreground"><ShieldCheck className="size-3" aria-hidden="true" /> Comunitario</Badge>
                </div>
                {text ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{text}</p> : null}
                {imageUrl ? <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background/50"><img src={imageUrl} alt={`Imagen compartida por ${author}`} className="max-h-80 w-auto object-contain" /></div> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
