"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Send, MessageCircle, Clock, ImagePlus, X } from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  type AvisoComunidad,
} from "@/lib/supabase";
import { APP_CONFIG } from "@/lib/app-config";
import { DEMO_AVISOS } from "@/lib/demo-data";
import { useAuth } from "@/contexts/auth-context";
import { ensureNotificationPermission, notify } from "@/lib/browser-notifications";
import { logger } from "@/lib/logger";
import {
  composeMessageWithImage,
  fileToDataUrl,
  isImageFile,
  parseMessageMedia,
} from "@/lib/message-media";

export default function CommunityPanel() {
  const [avisos, setAvisos] = useState<AvisoComunidad[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { usuario } = useAuth();

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  // Verificar configuración de Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      if (APP_CONFIG.demoMode) {
        logger.debug("ℹ️ Supabase no configurado, usando modo demo offline");
      } else {
        logger.error("❌ Supabase no está configurado correctamente");
      }
      setLoading(false);
      return;
    }
  }, []);

  const cargarAvisos = async () => {
    if (!supabase && APP_CONFIG.demoMode) {
      setAvisos(DEMO_AVISOS);
      setLoading(false);
      return;
    }

    if (!supabase) {
      logger.error("❌ No se puede cargar avisos: Supabase no configurado");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("avisos_comunidad")
        .select(
          `
          *,
          usuarios (
            id,
            nombre,
            telefono
          )
        `
        )
        .eq("estado", "activo")
        .order("fecha_creacion", { ascending: false })
        .limit(20);

      if (error) {
        logger.error("Error cargando avisos:", error);
        return;
      }

      setAvisos(data || []);
    } catch (error) {
      logger.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase && APP_CONFIG.demoMode) {
      setAvisos(DEMO_AVISOS);
      setLoading(false);
      return;
    }

    if (!supabase) {
      logger.error(
        "❌ No se puede configurar suscripción: Supabase no configurado"
      );
      setLoading(false);
      return;
    }

    cargarAvisos();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel("avisos_comunidad_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "avisos_comunidad" },
        () => {
          notify("Nuevo aviso comunitario", "Se publicó un nuevo mensaje en la comunidad");
          if (supabase) {
            cargarAvisos();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const enviarAviso = async () => {
    if (APP_CONFIG.demoReadOnly) {
      logger.warn("Modo demo activo: envío de avisos bloqueado");
      return;
    }

    if ((!nuevoMensaje.trim() && !imageFile) || !usuario) {
      logger.warn("No se puede enviar: mensaje vacío o usuario no autenticado");
      return;
    }

    if (!supabase) {
      logger.error("❌ No se puede enviar aviso: Supabase no configurado");
      return;
    }

    if (!usuario.id) {
      logger.error("❌ No se puede enviar aviso: Usuario sin ID");
      return;
    }

    logger.debug("Enviando aviso:", {
      usuario_id: usuario.id,
      mensaje: nuevoMensaje.trim(),
      usuario: usuario,
    });

    // VERIFICAR que el usuario existe en la base de datos
    logger.debug("🔍 Verificando usuario en base de datos...");
    try {
      const { data: usuarioVerificado, error: errorVerificacion } =
        await supabase
          .from("usuarios")
          .select("*")
          .eq("id", usuario.id)
          .single();

      if (errorVerificacion || !usuarioVerificado) {
        logger.error("❌ Usuario no encontrado en base de datos:", {
          usuario_id: usuario.id,
          error: errorVerificacion,
        });

        alert(
          "Error: Tu usuario no existe en la base de datos. Por favor, cierra sesión y vuelve a iniciar sesión."
        );

        // Limpiar sesión corrupta
        if (typeof window !== "undefined") {
          localStorage.removeItem("vulcania_usuario");
          window.location.reload();
        }
        return;
      }

      logger.debug("✅ Usuario verificado en base de datos:", usuarioVerificado);
    } catch (verificationError) {
      logger.error("❌ Error verificando usuario:", verificationError);
      return;
    }

    const mensajeOriginal = nuevoMensaje.trim();
    const fileOriginal = imageFile;
    setNuevoMensaje("");
    setImageFile(null);
    setImagePreview(null);
    setEnviando(true);

    try {
      let imageUrl: string | undefined;
      if (fileOriginal) {
        imageUrl = await fileToDataUrl(fileOriginal);
      }

      const mensajeTexto = composeMessageWithImage(mensajeOriginal, imageUrl);

      const { data, error } = await supabase.from("avisos_comunidad").insert([
        {
          usuario_id: usuario.id,
          mensaje: mensajeTexto,
          estado: "activo",
        },
      ]).select(`
        *,
        usuarios (
          id,
          nombre,
          telefono
        )
      `);

      if (error) {
        logger.error("Error enviando aviso:", error);
        logger.error("Detalles del error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setNuevoMensaje(mensajeOriginal);
        setImageFile(fileOriginal ?? null);
        setImagePreview(fileOriginal ? await fileToDataUrl(fileOriginal) : null);
        return;
      }

      // Agregar el nuevo aviso inmediatamente al estado local
      if (data && data[0]) {
        setAvisos((prev) => [data[0], ...prev]);
      }
    } catch (error) {
      logger.error("Error:", error);
      setNuevoMensaje(mensajeOriginal);
      setImageFile(fileOriginal ?? null);
      if (fileOriginal) {
        setImagePreview(await fileToDataUrl(fileOriginal));
      }
    } finally {
      setEnviando(false);
    }
  };

  const calcularTiempoTranscurrido = (fechaISO: string) => {
    const ahora = new Date();
    const fecha = new Date(fechaISO);
    const diferencia = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) return `Hace ${dias}d`;
    if (horas > 0) return `Hace ${horas}h`;
    return `Hace ${minutos}m`;
  };

  const getTipoMensaje = (mensaje: string) => {
    const mensajeLower = mensaje.toLowerCase();
    if (
      mensajeLower.includes("peligro") ||
      mensajeLower.includes("emergencia") ||
      mensajeLower.includes("evacuación")
    ) {
      return "warning";
    }
    if (
      mensajeLower.includes("seguro") ||
      mensajeLower.includes("tranquilo") ||
      mensajeLower.includes("bien")
    ) {
      return "safe";
    }
    return "info";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Users className="h-6 w-6 mr-2 text-blue-500" />
          Conexión Comunitaria
        </h3>
        <Badge
          variant="outline"
          className="border-blue-800 text-blue-400 bg-blue-900/20"
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          {avisos.length} mensajes
        </Badge>
      </div>

      {/* Formulario para nuevo aviso */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            Compartir información
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {APP_CONFIG.demoReadOnly && (
            <div className="rounded-md border border-yellow-700 bg-yellow-900/20 p-3 text-sm text-yellow-200">
              Modo demo: el foro está en solo lectura.
            </div>
          )}

          <Textarea
            placeholder={
              isSupabaseConfigured()
                ? "¿Cómo está la situación en tu sector? Comparte información útil para la comunidad..."
                : "Configuración de base de datos requerida para enviar mensajes..."
            }
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[100px] text-base"
            maxLength={500}
            disabled={!isSupabaseConfigured() || APP_CONFIG.demoReadOnly}
          />
          {imagePreview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Vista previa" className="max-h-44 rounded-md border border-gray-700" />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-black/80 text-white rounded-full p-1"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700">
                <ImagePlus className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!isSupabaseConfigured() || APP_CONFIG.demoReadOnly || enviando}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!isImageFile(file)) return;
                    setImageFile(file);
                    setImagePreview(await fileToDataUrl(file));
                  }}
                />
              </label>
              <span className="text-gray-500 text-sm">{nuevoMensaje.length}/500 caracteres</span>
            </div>
            <Button
              onClick={enviarAviso}
              disabled={
                (!nuevoMensaje.trim() && !imageFile) ||
                enviando ||
                !isSupabaseConfigured() ||
                APP_CONFIG.demoReadOnly
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enviando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Enviar</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de avisos */}
      <div className="space-y-4">
        {!isSupabaseConfigured() && !APP_CONFIG.demoMode ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-400">Error de configuración</p>
            <p className="text-gray-500 text-sm">
              Supabase no está configurado correctamente
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Cargando mensajes...</p>
          </div>
        ) : avisos.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No hay mensajes aún</p>
            <p className="text-gray-500 text-sm">
              Sé el primero en compartir información
            </p>
          </div>
        ) : (
          avisos.map((aviso) => {
            const { text, imageUrl } = parseMessageMedia(aviso.mensaje);
            const tipoMensaje = getTipoMensaje(text || aviso.mensaje);
            return (
              <Card key={aviso.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {aviso.usuarios?.nombre?.charAt(0) || "U"}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">
                          {aviso.usuarios?.nombre || "Usuario"}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            {calcularTiempoTranscurrido(aviso.fecha_creacion)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        tipoMensaje === "warning"
                          ? "border-yellow-800 text-yellow-400 bg-yellow-950"
                          : tipoMensaje === "safe"
                          ? "border-green-800 text-green-400 bg-green-950"
                          : "border-blue-800 text-blue-400 bg-blue-950"
                      }
                    >
                      {tipoMensaje === "warning"
                        ? "Alerta"
                        : tipoMensaje === "safe"
                        ? "Seguro"
                        : "Info"}
                    </Badge>
                  </div>
                  {text ? (
                    <p className="text-gray-300 leading-relaxed">{text}</p>
                  ) : null}
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Imagen comunitaria"
                      className="mt-3 rounded-md border border-gray-700 max-h-72 w-auto"
                    />
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
