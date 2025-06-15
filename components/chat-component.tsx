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
} from "lucide-react";
import {
  supabase,
  type Usuario,
  type MensajeChat,
  type EstadisticasConversacion,
} from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

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
  const [conectado, setConectado] = useState(true);
  const [conversacionesLeidas, setConversacionesLeidas] = useState<Set<string>>(
    new Set()
  ); // IDs de conversaciones marcadas como leídas
  const { usuario } = useAuth();
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  // Solicitar permisos de notificación al montar el componente
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          console.log("📢 Permisos de notificación:", permission);
        });
      }
    }
  }, []);

  // Función para recargar estadísticas de conversaciones
  const recargarConversaciones = useCallback(async () => {
    if (!supabase || !usuario) return;

    try {
      console.log("🔄 Recargando estadísticas de conversaciones...");
      console.log("👤 Usuario actual:", usuario.id);
      console.log(
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
        console.error("Error cargando usuarios:", errorUsuarios);
        return;
      }

      console.log("👥 Usuarios encontrados:", todosUsuarios.length);

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
          console.error("Error obteniendo último mensaje:", errorMensaje);
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
          console.log(
            `📬 Usuario ${otroUsuario.nombre} tiene mensajes no leídos`
          );
        } else {
          console.log(
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

      console.log("📊 Estadísticas cargadas:", estadisticasOrdenadas);
      setConversaciones(estadisticasOrdenadas);
    } catch (error) {
      console.error("Error recargando conversaciones:", error);
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
          console.error("Error cargando mensajes:", error);
          return;
        }

        setMensajes(data || []);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    cargarMensajes();

    // Suscribirse a nuevos mensajes en tiempo real
    console.log("🔄 Configurando suscripción en tiempo real para mensajes...");

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
          console.log("📨 Nuevo mensaje recibido en tiempo real:", payload);

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
                console.log(
                  "✅ Añadiendo mensaje en tiempo real:",
                  mensajeCompleto
                );

                // Agregar el mensaje solo si no existe ya (evitar duplicados)
                setMensajes((prev) => {
                  const existe = prev.some((m) => m.id === mensajeCompleto.id);
                  if (existe) {
                    console.log("⚠️ Mensaje ya existe, evitando duplicado");
                    return prev;
                  }

                  // Si recibimos un mensaje en la conversación activa, agregarlo inmediatamente
                  return [...prev, mensajeCompleto];
                });
              }
            } catch (error) {
              console.error("❌ Error obteniendo mensaje completo:", error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Estado de suscripción:", status);

        // Actualizar estado de conexión basado en el status
        if (status === "SUBSCRIBED") {
          setConectado(true);
          console.log("🟢 Conectado en tiempo real");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConectado(false);
          console.log("🔴 Error de conexión en tiempo real");
        }
      });

    return () => {
      console.log("🔌 Desconectando suscripción en tiempo real");
      subscription.unsubscribe();
    };
  }, [usuarioSeleccionado, usuario, recargarConversaciones]);

  // Suscripción global para escuchar TODOS los mensajes dirigidos al usuario actual
  useEffect(() => {
    if (!usuario || !supabase) return;

    console.log(
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
          console.log("🌐 Nuevo mensaje global recibido:", payload);

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
              console.log(
                `📬 Marcando conversación como no leída: ${nuevoMensaje.emisor_id}`
              );
              return nuevasLeidas;
            });

            // Recargar conversaciones para actualizar el badge
            recargarConversaciones();
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Estado de suscripción global:", status);
      });

    return () => {
      console.log("🔌 Desconectando suscripción global");
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

    console.log(
      "📖 Marcando conversación como leída para usuario:",
      user.nombre
    );
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !usuario || !usuarioSeleccionado || !supabase)
      return;

    const mensajeTexto = nuevoMensaje.trim();
    setNuevoMensaje(""); // Limpiar inmediatamente para mejor UX
    setEnviando(true);

    try {
      const { data, error } = await supabase.from("mensajes_chat").insert([
        {
          emisor_id: usuario.id,
          receptor_id: usuarioSeleccionado.id,
          mensaje: mensajeTexto,
        },
      ]).select(`
        *,
        emisor:emisor_id (id, nombre),
        receptor:receptor_id (id, nombre)
      `);

      if (error) {
        console.error("Error enviando mensaje:", error);
        setNuevoMensaje(mensajeTexto); // Restaurar mensaje si hay error
        return;
      }

      // Agregar el nuevo mensaje inmediatamente al estado local
      if (data && data[0]) {
        setMensajes((prev) => [...prev, data[0]]);
      }

      // Recargar conversaciones para actualizar último mensaje
      recargarConversaciones();
    } catch (error) {
      console.error("Error:", error);
      setNuevoMensaje(mensajeTexto); // Restaurar mensaje si hay error
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
    console.log("🔄 Reseteando estado de conversaciones leídas...");
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
                        <p className="text-sm">{mensaje.mensaje}</p>
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
        <Input
          placeholder="Escribe un mensaje..."
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && enviarMensaje()}
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-base"
          disabled={enviando}
        />
        <Button
          onClick={enviarMensaje}
          disabled={!nuevoMensaje.trim() || enviando}
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
