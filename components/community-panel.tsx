"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Send, MessageCircle, Clock } from "lucide-react";
import { supabase, type AvisoComunidad } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export default function CommunityPanel() {
  const [avisos, setAvisos] = useState<AvisoComunidad[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const { usuario } = useAuth();

  const cargarAvisos = async () => {
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
        console.error("Error cargando avisos:", error);
        return;
      }

      setAvisos(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAvisos();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel("avisos_comunidad_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "avisos_comunidad" },
        () => {
          cargarAvisos();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const enviarAviso = async () => {
    if (!nuevoMensaje.trim() || !usuario) return;

    const mensajeTexto = nuevoMensaje.trim();
    setNuevoMensaje(""); // Limpiar inmediatamente para mejor UX
    setEnviando(true);

    try {
      const { data, error } = await supabase.from("avisos_comunidad").insert([
        {
          usuario_id: usuario.id,
          mensaje: mensajeTexto,
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
        console.error("Error enviando aviso:", error);
        setNuevoMensaje(mensajeTexto); // Restaurar mensaje si hay error
        return;
      }

      // Agregar el nuevo aviso inmediatamente al estado local
      if (data && data[0]) {
        setAvisos((prev) => [data[0], ...prev]);
      }
    } catch (error) {
      console.error("Error:", error);
      setNuevoMensaje(mensajeTexto); // Restaurar mensaje si hay error
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
          <Textarea
            placeholder="¿Cómo está la situación en tu sector? Comparte información útil para la comunidad..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[100px] text-base"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">
              {nuevoMensaje.length}/500 caracteres
            </span>
            <Button
              onClick={enviarAviso}
              disabled={!nuevoMensaje.trim() || enviando}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
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
        {loading ? (
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
            const tipoMensaje = getTipoMensaje(aviso.mensaje);
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
                  <p className="text-gray-300 leading-relaxed">
                    {aviso.mensaje}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
