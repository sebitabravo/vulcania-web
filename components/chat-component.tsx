"use client";

import { useEffect, useState, useRef } from "react";
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
import { supabase, type Usuario, type MensajeChat } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export default function ChatComponent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<Usuario | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [conectado, setConectado] = useState(true); // Estado de conexión
  const { usuario } = useAuth();
  const mensajesEndRef = useRef<HTMLDivElement>(null); // Para auto-scroll

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

  useEffect(() => {
    const cargarUsuarios = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("*")
          .neq("id", usuario?.id)
          .order("nombre");

        if (error) {
          console.error("Error cargando usuarios:", error);
          return;
        }

        setUsuarios(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (usuario) {
      cargarUsuarios();
    }
  }, [usuario]);

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
            emisor:emisor_id (
              id,
              nombre
            ),
            receptor:receptor_id (
              id,
              nombre
            )
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
                  emisor:emisor_id (
                    id,
                    nombre
                  ),
                  receptor:receptor_id (
                    id,
                    nombre
                  )
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

                  // Notificación si es mensaje de otro usuario y la ventana no está enfocada
                  if (
                    mensajeCompleto.emisor_id !== usuario.id &&
                    !document.hasFocus()
                  ) {
                    // Crear notificación nativa del browser
                    if (Notification.permission === "granted") {
                      new Notification(
                        `Nuevo mensaje de ${mensajeCompleto.emisor?.nombre}`,
                        {
                          body: mensajeCompleto.mensaje,
                          icon: "/volcano-icon.png", // Puedes añadir un icono
                        }
                      );
                    }
                  }

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
  }, [usuarioSeleccionado, usuario]);

  // Auto-scroll cuando lleguen nuevos mensajes
  useEffect(() => {
    if (mensajesEndRef.current) {
      mensajesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes]);

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
        emisor:emisor_id (
          id,
          nombre
        ),
        receptor:receptor_id (
          id,
          nombre
        )
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
        <h3 className="text-xl font-semibold text-white flex items-center">
          <MessageCircle className="h-6 w-6 mr-2 text-green-500" />
          Chat Comunitario
        </h3>

        <div className="space-y-3">
          {usuarios.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No hay otros usuarios disponibles</p>
            </div>
          ) : (
            usuarios.map((user) => (
              <Card
                key={user.id}
                className="bg-gray-900 border-gray-800 cursor-pointer hover:border-green-700 transition-colors"
                onClick={() => setUsuarioSeleccionado(user)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-lg">
                        {user.nombre.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{user.nombre}</h4>
                      <p className="text-gray-400 text-sm">Toca para chatear</p>
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
