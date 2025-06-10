"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Send, User, ArrowLeft } from "lucide-react";
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
  const { usuario } = useAuth();

  useEffect(() => {
    const cargarUsuarios = async () => {
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

  const cargarMensajes = async () => {
    if (!usuarioSeleccionado || !usuario) return;

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

  useEffect(() => {
    if (!usuarioSeleccionado || !usuario) return;

    cargarMensajes();

    // Suscribirse a nuevos mensajes
    const subscription = supabase
      .channel("mensajes_chat_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes_chat" },
        (payload) => {
          const nuevoMensaje = payload.new as MensajeChat;
          if (
            (nuevoMensaje.emisor_id === usuario.id &&
              nuevoMensaje.receptor_id === usuarioSeleccionado.id) ||
            (nuevoMensaje.emisor_id === usuarioSeleccionado.id &&
              nuevoMensaje.receptor_id === usuario.id)
          ) {
            cargarMensajes();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [usuarioSeleccionado, usuario]);

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !usuario || !usuarioSeleccionado) return;

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
          <h3 className="text-white font-medium">
            {usuarioSeleccionado.nombre}
          </h3>
          <p className="text-gray-400 text-sm">Chat privado</p>
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
