"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageCircle,
  Send,
  User,
  ArrowLeft,
  Wifi,
  WifiOff,
  ImagePlus,
  X,
} from "lucide-react";
import {
  supabase,
  type Usuario,
  type MensajeChat,
  type EstadisticasConversacion,
} from "@/lib/supabase";
import { APP_CONFIG } from "@/lib/app-config";
import { DEMO_USUARIO } from "@/lib/demo-data";
import { useAuth } from "@/contexts/auth-context";
import { ensureNotificationPermission, notify } from "@/lib/browser-notifications";
import { logger } from "@/lib/logger";
import {
  composeMessageWithImage,
  fileToDataUrl,
  isImageFile,
  parseMessageMedia,
} from "@/lib/message-media";

const OFFLINE_USERS: Usuario[] = [
  DEMO_USUARIO,
  {
    id: "demo-maria",
    nombre: "María González",
    telefono: "+56 9 1234 5678",
    fecha_creacion: new Date().toISOString(),
  },
  {
    id: "demo-carlos",
    nombre: "Carlos Muñoz",
    telefono: "+56 9 9876 5432",
    fecha_creacion: new Date().toISOString(),
  },
];

export default function ChatComponent() {
  const [conversaciones, setConversaciones] = useState<
    EstadisticasConversacion[]
  >([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<Usuario | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [conectado, setConectado] = useState(true);
  const [conversacionesLeidas, setConversacionesLeidas] = useState<Set<string>>(
    new Set()
  ); // IDs de conversaciones marcadas como leídas
  const { usuario } = useAuth();
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  // Solicitar permisos de notificación al montar el componente
  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  // Función para recargar estadísticas de conversaciones
  const recargarConversaciones = useCallback(async () => {
    if (APP_CONFIG.demoMode && usuario) {
      const data = OFFLINE_USERS
        .filter((u) => u.id !== usuario.id)
        .map((u) => ({
          usuario: u,
          mensajesNoLeidos: 0,
          fechaUltimaActividad: new Date().toISOString(),
        })) as EstadisticasConversacion[];
      setConversaciones(data);
      return;
    }

    if (!supabase || !usuario) return;

    try {
      logger.debug("🔄 Recargando estadísticas de conversaciones...");
      logger.debug("👤 Usuario actual:", usuario.id);
      logger.debug(
        "📖 Conversaciones marcadas como leídas:",
        Array.from(conversacionesLeidas)
      );

      // Obtener todos los usuarios excepto el actual
      const { data: todosUsuarios, error: errorUsuarios } = await supabase
        .from("usuarios")
        .select("*")
        .neq("id", usuario.id)
        .order("nombre");

      if (errorUsuarios || !todosUsuarios) {
        logger.error("Error cargando usuarios:", errorUsuarios);
        return;
      }

      logger.debug("👥 Usuarios encontrados:", todosUsuarios.length);

      // Para cada usuario, obtener estadísticas de conversación
      const estadisticasPromises = todosUsuarios.map(async (otroUsuario) => {
        if (!supabase) return null;

        // Obtener el último mensaje de la conversación (consulta simplificada)
        const { data: ultimoMensaje, error: errorMensaje } = await supabase
          .from("mensajes_chat")
          .select("id, emisor_id, receptor_id, mensaje, fecha_envio")
          .or(
            `and(emisor_id.eq.${usuario.id},receptor_id.eq.${otroUsuario.id}),and(emisor_id.eq.${otroUsuario.id},receptor_id.eq.${usuario.id})`
          )
          .order("fecha_envio", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (errorMensaje) {
          logger.error("Error obteniendo último mensaje:", errorMensaje);
        }

        // Lógica simplificada para mensajes no leídos (solo estado local)
        let mensajesNoLeidos = 0;

        // Solo mostrar badge si:
        // 1. Hay un último mensaje
        // 2. El último mensaje es del otro usuario (no mío)
        // 3. No hemos marcado esta conversación como leída localmente
        if (
          ultimoMensaje &&
          ultimoMensaje.emisor_id === otroUsuario.id &&
          !conversacionesLeidas.has(otroUsuario.id)
        ) {
          // Mostrar 1 mensaje no leído (sin hacer consultas adicionales a la DB)
          mensajesNoLeidos = 1;
          logger.debug(
            `📬 Usuario ${otroUsuario.nombre} tiene mensajes no leídos`
          );
        } else {
          logger.debug(
            `✅ Usuario ${otroUsuario.nombre} - sin mensajes no leídos`
          );
        }

        const estadistica: EstadisticasConversacion = {
          usuario: otroUsuario,
          ultimoMensaje: ultimoMensaje || undefined,
          mensajesNoLeidos: mensajesNoLeidos,
          fechaUltimaActividad:
            ultimoMensaje?.fecha_envio || otroUsuario.fecha_creacion,
        };

        return estadistica;
      });

      const estadisticasResult = await Promise.all(estadisticasPromises);
      const estadisticas = estadisticasResult.filter(
        (e) => e !== null
      ) as EstadisticasConversacion[];

      // Ordenar por: 1) Mensajes no leídos (descendente), 2) Fecha de última actividad (descendente)
      const estadisticasOrdenadas = estadisticas.sort((a, b) => {
        if (a.mensajesNoLeidos !== b.mensajesNoLeidos) {
          return b.mensajesNoLeidos - a.mensajesNoLeidos;
        }
        return (
          new Date(b.fechaUltimaActividad).getTime() -
          new Date(a.fechaUltimaActividad).getTime()
        );
      });

      logger.debug("📊 Estadísticas cargadas:", estadisticasOrdenadas);
      setConversaciones(estadisticasOrdenadas);
    } catch (error) {
      logger.error("Error recargando conversaciones:", error);
    }
  }, [usuario, conversacionesLeidas]);

  // Cargar conversaciones al inicio
  useEffect(() => {
    if (usuario) {
      recargarConversaciones().then(() => setLoading(false));
    }
  }, [usuario, recargarConversaciones]);

  // Cargar mensajes y suscribirse a tiempo real
  useEffect(() => {
    if (APP_CONFIG.demoMode && usuarioSeleccionado) {
      const demoMsgs: MensajeChat[] = [
        {
          id: "demo-msg-1",
          emisor_id: usuarioSeleccionado.id,
          receptor_id: usuario?.id || "",
          mensaje: "Este es un chat de demostración sin backend.",
          fecha_envio: new Date(Date.now() - 120000).toISOString(),
        },
        {
          id: "demo-msg-2",
          emisor_id: usuario?.id || "",
          receptor_id: usuarioSeleccionado.id,
          mensaje: "Perfecto, funcionando en modo offline demo.",
          fecha_envio: new Date(Date.now() - 60000).toISOString(),
        },
      ];
      setMensajes(demoMsgs);
      return;
    }

    if (!usuarioSeleccionado || !usuario || !supabase) return;

    const cargarMensajes = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from("mensajes_chat")
          .select(
            `
            *,
            emisor:emisor_id (id, nombre),
            receptor:receptor_id (id, nombre)
          `
          )
          .or(
            `and(emisor_id.eq.${usuario.id},receptor_id.eq.${usuarioSeleccionado.id}),and(emisor_id.eq.${usuarioSeleccionado.id},receptor_id.eq.${usuario.id})`
          )
          .order("fecha_envio", { ascending: true });

        if (error) {
          logger.error("Error cargando mensajes:", error);
          return;
        }

        setMensajes(data || []);
      } catch (error) {
        logger.error("Error:", error);
      }
    };

    cargarMensajes();

    // Suscribirse a nuevos mensajes en tiempo real
    logger.debug("🔄 Configurando suscripción en tiempo real para mensajes...");

    const subscription = supabase
      .channel(`mensajes_chat_${usuario.id}_${usuarioSeleccionado.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes_chat",
          filter: `or(and(emisor_id.eq.${usuario.id},receptor_id.eq.${usuarioSeleccionado.id}),and(emisor_id.eq.${usuarioSeleccionado.id},receptor_id.eq.${usuario.id}))`,
        },
        async (payload) => {
          logger.debug("📨 Nuevo mensaje recibido en tiempo real:", payload);

          const nuevoMensaje = payload.new as MensajeChat;

          // Verificar que el mensaje es para esta conversación
          if (
            (nuevoMensaje.emisor_id === usuario.id &&
              nuevoMensaje.receptor_id === usuarioSeleccionado.id) ||
            (nuevoMensaje.emisor_id === usuarioSeleccionado.id &&
              nuevoMensaje.receptor_id === usuario.id)
          ) {
            // Obtener los datos completos del mensaje con los usuarios
            try {
              if (!supabase) return;

              const { data: mensajeCompleto, error } = await supabase
                .from("mensajes_chat")
                .select(
                  `
                  *,
                  emisor:emisor_id (id, nombre),
                  receptor:receptor_id (id, nombre)
                `
                )
                .eq("id", nuevoMensaje.id)
                .single();

              if (!error && mensajeCompleto) {
                logger.debug(
                  "✅ Añadiendo mensaje en tiempo real:",
                  mensajeCompleto
                );

                // Agregar el mensaje solo si no existe ya (evitar duplicados)
                setMensajes((prev) => {
                  const existe = prev.some((m) => m.id === mensajeCompleto.id);
                  if (existe) {
                    logger.debug("⚠️ Mensaje ya existe, evitando duplicado");
                    return prev;
                  }

                  // Si recibimos un mensaje en la conversación activa, agregarlo inmediatamente
                  return [...prev, mensajeCompleto];
                });
              }
            } catch (error) {
              logger.error("❌ Error obteniendo mensaje completo:", error);
            }
          }
        }
      )
      .subscribe((status) => {
        logger.debug("📡 Estado de suscripción:", status);

        // Actualizar estado de conexión basado en el status
        if (status === "SUBSCRIBED") {
          setConectado(true);
          logger.debug("🟢 Conectado en tiempo real");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConectado(false);
          logger.debug("🔴 Error de conexión en tiempo real");
        }
      });

    return () => {
      logger.debug("🔌 Desconectando suscripción en tiempo real");
      subscription.unsubscribe();
    };
  }, [usuarioSeleccionado, usuario, recargarConversaciones]);

  // Suscripción global para escuchar TODOS los mensajes dirigidos al usuario actual
  useEffect(() => {
    if (APP_CONFIG.demoMode) return;

    if (!usuario || !supabase) return;

    logger.debug(
      "🌐 Configurando suscripción global para mensajes dirigidos al usuario..."
    );

    const globalSubscription = supabase
      .channel(`global_mensajes_${usuario.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes_chat",
          filter: `receptor_id.eq.${usuario.id}`,
        },
        async (payload) => {
          logger.debug("🌐 Nuevo mensaje global recibido:", payload);

          const nuevoMensaje = payload.new as MensajeChat;

          // Si el mensaje NO es de la conversación actualmente abierta,
          // marcar esa conversación como "no leída"
          if (
            !usuarioSeleccionado ||
            nuevoMensaje.emisor_id !== usuarioSeleccionado.id
          ) {
            setConversacionesLeidas((prev) => {
              const nuevasLeidas = new Set(prev);
              nuevasLeidas.delete(nuevoMensaje.emisor_id);
              return nuevasLeidas;
            });

            notify("Nuevo mensaje", "Recibiste un mensaje en el chat comunitario");

            // Recargar conversaciones para actualizar el badge
            recargarConversaciones();
          }
        }
      )
      .subscribe((status) => {
        logger.debug("📡 Estado de suscripción global:", status);
      });

    return () => {
      logger.debug("🔌 Desconectando suscripción global");
      globalSubscription.unsubscribe();
    };
  }, [usuario, usuarioSeleccionado, recargarConversaciones]);

  // Auto-scroll cuando lleguen nuevos mensajes
  useEffect(() => {
    if (mensajesEndRef.current) {
      mensajesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes]);

  // Función para seleccionar usuario y marcar la conversación como leída
  const seleccionarUsuario = async (user: Usuario) => {
    setUsuarioSeleccionado(user);

    // Marcar esta conversación como leída localmente
    setConversacionesLeidas((prev) => new Set(prev.add(user.id)));

    logger.debug(
      "📖 Marcando conversación como leída para usuario:",
      user.nombre
    );
  };

  const enviarMensaje = async () => {
    if (APP_CONFIG.demoReadOnly) {
      logger.warn("Modo demo activo: chat en solo lectura");
      return;
    }

    if ((!nuevoMensaje.trim() && !imageFile) || !usuario || !usuarioSeleccionado || !supabase)
      return;

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

      const { data, error } = await supabase
        .from("mensajes_chat")
        .insert([
          {
            emisor_id: usuario.id,
            receptor_id: usuarioSeleccionado.id,
            mensaje: mensajeTexto,
          },
        ])
        .select(`
          *,
          emisor:emisor_id (id, nombre),
          receptor:receptor_id (id, nombre)
        `);

      if (error) {
        logger.error("Error enviando mensaje:", error);
        setNuevoMensaje(mensajeOriginal);
        setImageFile(fileOriginal ?? null);
        setImagePreview(fileOriginal ? await fileToDataUrl(fileOriginal) : null);
        return;
      }

      if (data && data[0]) {
        setMensajes((prev) => [...prev, data[0]]);
      }

      recargarConversaciones();
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

  const formatearHora = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Función para resetear el estado de conversaciones leídas (útil para debugging)
  const resetearEstadoLeido = () => {
    logger.debug("🔄 Reseteando estado de conversaciones leídas...");
    setConversacionesLeidas(new Set());
    recargarConversaciones();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-400">Cargando chat...</p>
      </div>
    );
  }

  if (!usuarioSeleccionado) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle className="h-6 w-6 mr-2 text-green-500" />
            Chat Comunitario
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetearEstadoLeido}
            className="text-xs bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            🔄 Reset
          </Button>
        </h3>

        <div className="space-y-3">
          {conversaciones.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No hay otros usuarios disponibles</p>
            </div>
          ) : (
            conversaciones.map((conversacion) => (
              <Card
                key={conversacion.usuario.id}
                className={`bg-gray-900 border-gray-800 cursor-pointer hover:border-green-700 transition-colors ${
                  conversacion.mensajesNoLeidos > 0 ? "border-green-600/50" : ""
                }`}
                onClick={() => seleccionarUsuario(conversacion.usuario)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {conversacion.usuario.nombre.charAt(0)}
                        </span>
                      </div>
                      {/* Badge de mensajes no leídos */}
                      {conversacion.mensajesNoLeidos > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {conversacion.mensajesNoLeidos > 9
                              ? "9+"
                              : conversacion.mensajesNoLeidos}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`font-medium ${
                            conversacion.mensajesNoLeidos > 0
                              ? "text-white"
                              : "text-gray-300"
                          }`}
                        >
                          {conversacion.usuario.nombre}
                        </h4>
                        {conversacion.ultimoMensaje && (
                          <span className="text-xs text-gray-500">
                            {formatearHora(
                              conversacion.ultimoMensaje.fecha_envio
                            )}
                          </span>
                        )}
                      </div>

                      {/* Vista previa del último mensaje */}
                      {conversacion.ultimoMensaje ? (
                        <p
                          className={`text-sm truncate ${
                            conversacion.mensajesNoLeidos > 0
                              ? "text-gray-300"
                              : "text-gray-500"
                          }`}
                        >
                          {conversacion.ultimoMensaje.emisor_id === usuario?.id
                            ? "Tú: "
                            : ""}
                          {conversacion.ultimoMensaje.mensaje}
                        </p>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          Toca para chatear
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header del chat */}
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setUsuarioSeleccionado(null)}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
          <span className="text-white font-medium">
            {usuarioSeleccionado.nombre.charAt(0)}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium">
              {usuarioSeleccionado.nombre}
            </h3>
            {conectado ? (
              <span title="Conectado en tiempo real">
                <Wifi className="h-4 w-4 text-green-500" />
              </span>
            ) : (
              <span title="Sin conexión en tiempo real">
                <WifiOff className="h-4 w-4 text-red-500" />
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            {conectado ? "En tiempo real" : "Sin conexión"} • Chat privado
          </p>
        </div>
      </div>

      {/* Área de mensajes */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="h-96 p-4 overflow-y-auto">
            {mensajes.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No hay mensajes aún</p>
                <p className="text-gray-500 text-sm">Envía el primer mensaje</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mensajes.map((mensaje) => {
                  const esMio = mensaje.emisor_id === usuario?.id;
                  const { text, imageUrl } = parseMessageMedia(mensaje.mensaje);
                  return (
                    <div
                      key={mensaje.id}
                      className={`flex ${
                        esMio ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          esMio
                            ? "bg-green-600 text-white"
                            : "bg-gray-800 text-gray-200"
                        }`}
                      >
                        {text ? <p className="text-sm">{text}</p> : null}
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt="Imagen compartida"
                            className="mt-2 rounded-md max-h-56 w-auto border border-white/20"
                          />
                        ) : null}
                        <p
                          className={`text-xs mt-1 ${
                            esMio ? "text-green-200" : "text-gray-500"
                          }`}
                        >
                          {formatearHora(mensaje.fecha_envio)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Referencia para el auto-scroll */}
                <div ref={mensajesEndRef} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input para nuevo mensaje */}
      <div className="flex space-x-2">
        {APP_CONFIG.demoReadOnly && (
          <div className="w-full rounded-md border border-yellow-700 bg-yellow-900/20 p-3 text-sm text-yellow-200">
            Modo demo: el chat está en solo lectura.
          </div>
        )}
      </div>

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

      <div className="flex space-x-2 items-center">
        <label className="cursor-pointer inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700">
          <ImagePlus className="h-4 w-4" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={enviando || APP_CONFIG.demoReadOnly}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!isImageFile(file)) return;
              setImageFile(file);
              setImagePreview(await fileToDataUrl(file));
            }}
          />
        </label>

        <Input
          placeholder="Escribe un mensaje..."
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && enviarMensaje()}
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-base"
          disabled={enviando || APP_CONFIG.demoReadOnly}
        />
        <Button
          onClick={enviarMensaje}
          disabled={(!nuevoMensaje.trim() && !imageFile) || enviando || APP_CONFIG.demoReadOnly}
          className="bg-green-600 hover:bg-green-700 text-white px-6"
        >
          {enviando ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
