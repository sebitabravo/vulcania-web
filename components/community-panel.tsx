"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Send, MessageCircle, Clock } from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  type AvisoComunidad,
} from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
// DEBUG: Importar funciones de test
import {
  testSupabaseConnection,
  testTableStructure,
  testUserCreation,
  testMessageInsertion,
} from "../supabase-test";

export default function CommunityPanel() {
  const [avisos, setAvisos] = useState<AvisoComunidad[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const { usuario } = useAuth();

  // DEBUG: Log del estado del usuario
  useEffect(() => {
    console.log("🔧 Estado del usuario en CommunityPanel:", {
      usuario,
      hasId: usuario?.id,
      isConfigured: isSupabaseConfigured(),
    });
  }, [usuario]);

  // Verificar configuración de Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.error("❌ Supabase no está configurado correctamente");
      setLoading(false);
      return;
    }
  }, []);

  const cargarAvisos = async () => {
    if (!supabase) {
      console.error("❌ No se puede cargar avisos: Supabase no configurado");
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
    if (!supabase) {
      console.error(
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
    if (!nuevoMensaje.trim() || !usuario) {
      console.warn(
        "No se puede enviar: mensaje vacío o usuario no autenticado"
      );
      return;
    }

    if (!supabase) {
      console.error("❌ No se puede enviar aviso: Supabase no configurado");
      return;
    }

    if (!usuario.id) {
      console.error("❌ No se puede enviar aviso: Usuario sin ID");
      return;
    }

    console.log("Enviando aviso:", {
      usuario_id: usuario.id,
      mensaje: nuevoMensaje.trim(),
      usuario: usuario,
    });

    // VERIFICAR que el usuario existe en la base de datos
    console.log("🔍 Verificando usuario en base de datos...");
    try {
      const { data: usuarioVerificado, error: errorVerificacion } =
        await supabase
          .from("usuarios")
          .select("*")
          .eq("id", usuario.id)
          .single();

      if (errorVerificacion || !usuarioVerificado) {
        console.error("❌ Usuario no encontrado en base de datos:", {
          usuario_id: usuario.id,
          error: errorVerificacion,
        });

        alert(
          "Error: Tu usuario no existe en la base de datos. Por favor, cierra sesión y vuelve a iniciar sesión."
        );
        limpiarSesion();
        return;
      }

      console.log("✅ Usuario verificado en base de datos:", usuarioVerificado);
    } catch (verificationError) {
      console.error("❌ Error verificando usuario:", verificationError);
      return;
    }

    const mensajeTexto = nuevoMensaje.trim();
    setNuevoMensaje(""); // Limpiar inmediatamente para mejor UX
    setEnviando(true);

    try {
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
        console.error("Error enviando aviso:", error);
        console.error("Detalles del error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
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

  // Función para limpiar sesión corrupta
  const limpiarSesion = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vulcania_usuario");
      window.location.reload();
    }
  };

  // DEBUG: Agregar función de test
  const runDebugTests = async () => {
    console.log("🔧 INICIANDO TESTS DE DEBUG...");
    await testSupabaseConnection();
    await testTableStructure();
    if (usuario?.telefono) {
      const testUser = await testUserCreation(usuario.telefono);
      if (testUser) {
        await testMessageInsertion(testUser.id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* DEBUG: Botón de test temporal */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <h4 className="text-yellow-400 font-medium mb-2">🔧 Debug Mode</h4>
          <div className="flex gap-2">
            <Button
              onClick={runDebugTests}
              className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
              size="sm"
            >
              Ejecutar Tests de Supabase
            </Button>
            <Button
              onClick={limpiarSesion}
              className="bg-red-600 hover:bg-red-700 text-white text-sm"
              size="sm"
            >
              Limpiar Sesión
            </Button>
          </div>
        </div>
      )}

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
            placeholder={
              isSupabaseConfigured()
                ? "¿Cómo está la situación en tu sector? Comparte información útil para la comunidad..."
                : "Configuración de base de datos requerida para enviar mensajes..."
            }
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[100px] text-base"
            maxLength={500}
            disabled={!isSupabaseConfigured()}
          />
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">
              {nuevoMensaje.length}/500 caracteres
            </span>
            <Button
              onClick={enviarAviso}
              disabled={
                !nuevoMensaje.trim() || enviando || !isSupabaseConfigured()
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
        {!isSupabaseConfigured() ? (
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
