"use client";
/* User-selected data URLs are intentionally rendered without next/image. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ImagePlus, MessageCircle, Send, UserRound, Wifi, WifiOff, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { APP_CONFIG } from "@/lib/app-config";
import { addDemoMessage, DEMO_PROFILES, getDemoMessages, markDemoConversationRead } from "@/lib/demo-data";
import { formatFreshness, formatTime } from "@/lib/date-utils";
import { notify } from "@/lib/browser-notifications";
import { composeMessageWithImage, fileToDataUrl, parseMessageMedia, validateImageFile } from "@/lib/message-media";
import { isUuid, supabase, type EstadisticasConversacion, type MensajeChat, type PublicProfile } from "@/lib/supabase";

const MAX_MESSAGE_CHARS = 1_000;

function participantIds(message: MensajeChat, currentId: string, otherId: string): boolean {
  return (
    (message.emisor_id === currentId && message.receptor_id === otherId) ||
    (message.emisor_id === otherId && message.receptor_id === currentId)
  );
}

export default function ChatComponent() {
  const { usuario } = useAuth();
  const [profiles, setProfiles] = useState<PublicProfile[]>(() => (APP_CONFIG.demoMode ? DEMO_PROFILES : []));
  const [messages, setMessages] = useState<MensajeChat[]>(() => (APP_CONFIG.demoMode ? getDemoMessages() : []));
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(APP_CONFIG.demoMode);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const loadChat = async () => {
      if (!usuario) return;
      if (APP_CONFIG.demoMode) {
        if (mounted) {
          setProfiles(DEMO_PROFILES.filter((profile) => profile.id !== usuario.id));
          setMessages(getDemoMessages());
          setConnected(true);
          setLoading(false);
        }
        return;
      }
      if (!supabase || !isUuid(usuario.id)) {
        if (mounted) {
          setError("Chat persistente no disponible: la sesión no tiene un identificador válido.");
          setConnected(false);
          setLoading(false);
        }
        return;
      }

      const [{ data: profileData, error: profileError }, { data: messageData, error: messageError }] = await Promise.all([
        supabase.from("perfiles_publicos").select("id, nombre, rol, fecha_creacion").neq("id", usuario.id).order("nombre"),
        supabase.from("mensajes_chat").select("id, emisor_id, receptor_id, mensaje, fecha_envio, leido, fecha_lectura").or(`emisor_id.eq.${usuario.id},receptor_id.eq.${usuario.id}`).order("fecha_envio", { ascending: true }).limit(200),
      ]);

      if (!mounted) return;
      if (profileError || messageError) {
        setError("No pudimos cargar tus conversaciones. Revisa la configuración de Supabase.");
      } else {
        setProfiles((profileData as PublicProfile[]) || []);
        setMessages((messageData as MensajeChat[]) || []);
      }
      setConnected(!profileError && !messageError);
      setLoading(false);
    };

    void loadChat();
    if (APP_CONFIG.demoMode || !supabase || !usuario || !isUuid(usuario.id)) return () => { mounted = false; };

    const channel = supabase
      .channel(`vulcania-chat-${usuario.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes_chat" }, (payload) => {
        const nextMessage = payload.new as MensajeChat;
        if (nextMessage.emisor_id !== usuario.id && nextMessage.receptor_id !== usuario.id) return;
        if (nextMessage.emisor_id !== usuario.id && nextMessage.receptor_id === usuario.id) {
          notify("Nuevo mensaje", {
            body: "Recibiste un mensaje en el chat comunitario.",
            tag: `chat-${nextMessage.id}`,
          });
        }
        setMessages((current) => current.some((message) => message.id === nextMessage.id) ? current : [...current, nextMessage]);
      })
      .subscribe((status) => {
        if (mounted) setConnected(status === "SUBSCRIBED");
      });

    return () => {
      mounted = false;
      void channel.unsubscribe();
    };
  }, [usuario]);

  const conversations = useMemo<EstadisticasConversacion[]>(() => {
    if (!usuario) return [];
    return profiles
      .map((profile) => {
        const conversationMessages = messages.filter((message) => participantIds(message, usuario.id, profile.id));
        const latest = conversationMessages.at(-1);
        return {
          usuario: profile,
          ultimoMensaje: latest,
          mensajesNoLeidos: conversationMessages.filter((message) => message.receptor_id === usuario.id && !message.leido).length,
          fechaUltimaActividad: latest?.fecha_envio || profile.fecha_creacion || "",
        };
      })
      .sort((a, b) => b.fechaUltimaActividad.localeCompare(a.fechaUltimaActividad));
  }, [messages, profiles, usuario]);

  const selectedMessages = useMemo(() => {
    if (!usuario || !selectedProfile) return [];
    return messages.filter((message) => participantIds(message, usuario.id, selectedProfile.id));
  }, [messages, selectedProfile, usuario]);

  useEffect(() => {
    const node = messagesEndRef.current;
    if (node && typeof node.scrollIntoView === "function") node.scrollIntoView({ behavior: "auto" });
  }, [selectedMessages.length]);

  const selectConversation = async (profile: PublicProfile) => {
    if (!usuario) return;
    setSelectedProfile(profile);
    setError("");
    if (APP_CONFIG.demoMode) {
      setMessages(markDemoConversationRead(usuario.id, profile.id));
      return;
    }

    if (!supabase || !isUuid(usuario.id) || !isUuid(profile.id)) {
      setError("No hay una sesión persistente válida para actualizar la lectura.");
      return;
    }

    const hasUnread = messages.some(
      (message) => participantIds(message, usuario.id, profile.id) && message.receptor_id === usuario.id && !message.leido
    );
    if (!hasUnread) return;

    const { data, error: markReadError } = await supabase
      .from("mensajes_chat")
      .update({ leido: true, fecha_lectura: new Date().toISOString() })
      .eq("emisor_id", profile.id)
      .eq("receptor_id", usuario.id)
      .eq("leido", false)
      .select("id");

    if (markReadError || !data?.length) {
      setError("No pudimos guardar que leíste la conversación. Reintenta.");
      return;
    }

    setMessages((current) => current.map((message) => participantIds(message, usuario.id, profile.id) && message.receptor_id === usuario.id ? { ...message, leido: true, fecha_lectura: new Date().toISOString() } : message));
  };

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

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    if (APP_CONFIG.demoReadOnly) {
      setError("El modo demo está configurado como solo lectura.");
      return;
    }
    if (!usuario || !selectedProfile || (!draft.trim() && !imageFile)) {
      setError("Escribe un mensaje o adjunta una imagen antes de enviar.");
      return;
    }
    if (!APP_CONFIG.demoMode && (!supabase || !isUuid(usuario.id) || !isUuid(selectedProfile.id))) {
      setError("No hay una sesión persistente válida para enviar mensajes.");
      return;
    }

    const originalDraft = draft.trim();
    const originalFile = imageFile;
    setSending(true);
    setError("");
    try {
      const imageUrl = originalFile ? await fileToDataUrl(originalFile) : undefined;
      const messageText = composeMessageWithImage(originalDraft, imageUrl);
      if (APP_CONFIG.demoMode) {
        const nextMessage: MensajeChat = {
          id: `demo-message-${Date.now()}`,
          emisor_id: usuario.id,
          receptor_id: selectedProfile.id,
          mensaje: messageText,
          fecha_envio: new Date().toISOString(),
          leido: true,
        };
        setMessages(addDemoMessage(nextMessage));
      } else if (supabase) {
        const { data, error: insertError } = await supabase.from("mensajes_chat").insert({
          emisor_id: usuario.id,
          receptor_id: selectedProfile.id,
          mensaje: messageText,
        }).select("id, emisor_id, receptor_id, mensaje, fecha_envio, leido, fecha_lectura").single();
        if (insertError || !data) throw insertError ?? new Error("No se recibió el mensaje creado.");
        setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data as MensajeChat]);
      }
      setDraft("");
      clearImage();
    } catch {
      setError("No se pudo enviar el mensaje. Inténtalo nuevamente.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-border/70 bg-card/50 p-10 text-center text-sm text-muted-foreground">Cargando conversaciones…</div>;
  }

  if (!selectedProfile) {
    return (
      <section className="space-y-6" aria-labelledby="chat-title">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Coordinación directa</p>
          <h2 id="chat-title" className="mt-1 font-display text-2xl font-semibold tracking-tight">Chat comunitario</h2>
          <p className="mt-1 text-sm text-muted-foreground">Conversaciones privadas entre personas verificadas.</p>
        </div>
        {APP_CONFIG.demoMode ? <p className="rounded-lg border border-primary/20 bg-primary/[0.06] p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Simulación demo:</strong> los mensajes se mantienen en memoria mientras esta pestaña está abierta.</p> : null}
        {error ? <p role="alert" className="rounded-lg border border-yellow-300/25 bg-yellow-300/[0.06] p-3 text-sm text-yellow-100">{error}</p> : null}
        {conversations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center"><UserRound className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 font-display font-semibold">No hay conversaciones todavía</p><p className="mt-1 text-sm text-muted-foreground">Cuando haya otra persona disponible, aparecerá aquí.</p></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {conversations.map((conversation) => (
              <button key={conversation.usuario.id} type="button" onClick={() => void selectConversation(conversation.usuario)} className="group w-full rounded-xl border border-border/80 bg-card/60 p-4 text-left transition-colors hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-lg font-semibold text-primary">{conversation.usuario.nombre.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{conversation.usuario.nombre}</p>{conversation.ultimoMensaje ? <span className="font-mono text-[0.68rem] text-muted-foreground">{formatTime(conversation.ultimoMensaje.fecha_envio)}</span> : null}</div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{conversation.ultimoMensaje ? `${conversation.ultimoMensaje.emisor_id === usuario?.id ? "Tú: " : ""}${parseMessageMedia(conversation.ultimoMensaje.mensaje).text || "Imagen compartida"}` : "Inicia una conversación"}</p>
                  </div>
                  {conversation.mensajesNoLeidos > 0 ? <span aria-live="polite" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">{conversation.mensajesNoLeidos > 9 ? "9+" : conversation.mensajesNoLeidos}</span> : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="conversation-title">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedProfile(null)} aria-label="Volver a conversaciones"><ArrowLeft aria-hidden="true" /></Button>
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display font-semibold text-primary">{selectedProfile.nombre.charAt(0)}</div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 id="conversation-title" className="truncate font-display text-xl font-semibold">{selectedProfile.nombre}</h2>{connected ? <Wifi className="size-4 text-emerald-300" aria-label="Conectado en tiempo real" /> : <WifiOff className="size-4 text-yellow-200" aria-label="Sin conexión en tiempo real" />}</div><p className="text-xs text-muted-foreground">{connected ? "Conexión en tiempo real" : "Último estado disponible"} · conversación privada</p></div>
        <Badge variant="outline" className="hidden gap-1 border-border/80 text-muted-foreground sm:flex"><MessageCircle className="size-3" aria-hidden="true" /> Chat</Badge>
      </div>

      <Card className="border-border/80 bg-card/60">
        <CardContent className="p-0">
          <div className="min-h-[22rem] max-h-[32rem] overflow-y-auto p-4 sm:p-6" aria-live="polite">
            {selectedMessages.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center text-center"><MessageCircle className="size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 font-display font-semibold">Inicia la conversación</p><p className="mt-1 text-sm text-muted-foreground">Coordina información útil sin compartir datos sensibles.</p></div> : <div className="space-y-3">{selectedMessages.map((message) => { const mine = message.emisor_id === usuario?.id; const parsed = parseMessageMedia(message.mensaje); return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-md ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground"}`}>{parsed.text ? <p className="whitespace-pre-wrap text-sm leading-6">{parsed.text}</p> : null}{parsed.imageUrl ? <img src={parsed.imageUrl} alt="Imagen compartida" className="mt-2 max-h-56 rounded-lg border border-white/20 object-contain" /> : null}<p className={`mt-2 text-[0.68rem] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{formatTime(message.fecha_envio)} · {formatFreshness(message.fecha_envio).replace("Actualizado ", "")}</p></div></div>; })}<div ref={messagesEndRef} /></div>}
          </div>
        </CardContent>
      </Card>

      {APP_CONFIG.demoReadOnly ? <p className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-3 text-xs text-yellow-100">Modo demo solo lectura activado.</p> : null}
      {imagePreview ? <div className="relative w-fit"><img src={imagePreview} alt="Vista previa del mensaje" className="max-h-36 rounded-lg border border-border object-contain" /><button type="button" onClick={clearImage} aria-label="Quitar imagen" className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full border border-border bg-background shadow-lg"><X className="size-4" aria-hidden="true" /></button></div> : null}
      <form onSubmit={(event) => void sendMessage(event)} className="flex items-center gap-2">
        <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card/60 px-3 text-muted-foreground hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring" aria-label="Adjuntar imagen">
          <ImagePlus className="size-4" aria-hidden="true" />
          <input type="file" accept="image/*" className="sr-only" disabled={sending || APP_CONFIG.demoReadOnly} onChange={(event) => { void handleImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </label>
        <Input value={draft} maxLength={MAX_MESSAGE_CHARS} onChange={(event) => { setDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage(); } }} placeholder="Escribe un mensaje…" aria-label="Nuevo mensaje" disabled={sending || APP_CONFIG.demoReadOnly} className="min-h-11 bg-card/60" />
        <Button type="submit" size="icon" disabled={sending || APP_CONFIG.demoReadOnly || (!draft.trim() && !imageFile)} aria-label="Enviar mensaje" className="size-11 shrink-0">{sending ? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Send aria-hidden="true" />}</Button>
      </form>
      {error ? <p role="alert" className="text-sm leading-6 text-red-200">{error}</p> : null}
    </section>
  );
}
