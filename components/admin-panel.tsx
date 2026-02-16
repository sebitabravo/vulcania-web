"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  AlertTriangle,
  Activity,
  Shield,
  TrendingUp,
  X,
  MapPin,
  Users,
  MessageCircle,
  Trash2,
  Clock,
} from "lucide-react";
import { supabase, type PuntoEncuentro } from "@/lib/supabase";
import { APP_CONFIG } from "@/lib/app-config";

interface AdminPanelProps {
  onClose: () => void;
  onAlertChange?: () => void;
}

const niveles = [
  {
    nivel: "verde",
    label: "NORMAL",
    icon: Shield,
    color: "bg-green-600",
    descripcion: "Actividad volcánica normal",
  },
  {
    nivel: "amarillo",
    label: "PRECAUCIÓN",
    icon: Activity,
    color: "bg-yellow-600",
    descripcion: "Actividad volcánica elevada",
  },
  {
    nivel: "naranja",
    label: "ALERTA",
    icon: TrendingUp,
    color: "bg-orange-600",
    descripcion: "Actividad volcánica alta",
  },
  {
    nivel: "rojo",
    label: "EMERGENCIA",
    icon: AlertTriangle,
    color: "bg-red-600",
    descripcion: "Erupción inminente o en curso",
  },
];

export default function AdminPanel({
  onClose,
  onAlertChange,
}: AdminPanelProps) {
  const [currentLevel, setCurrentLevel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [puntosEncuentro, setPuntosEncuentro] = useState<PuntoEncuentro[]>([]);
  const [loadingPuntos, setLoadingPuntos] = useState(false);
  const [mensajesComunidad, setMensajesComunidad] = useState<any[]>([]);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [parametros, setParametros] = useState({
    sismos_24h: 45,
    temperatura_crater: "850°C",
    emision_so2: "1,200 ton/día",
    deformacion: "2.3 cm/mes",
  });

  useEffect(() => {
    cargarNivelActual();
    cargarPuntosEncuentro();
    cargarMensajesComunidad();
  }, []);

  const cargarNivelActual = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("alertas_volcan")
        .select("nivel_alerta")
        .order("ultima_actualizacion", { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setCurrentLevel(data.nivel_alerta);
      }
    } catch (error) {
      console.error("Error cargando nivel actual:", error);
    }
  };

  const cargarPuntosEncuentro = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("puntos_encuentro")
        .select("*")
        .order("nombre");

      if (data && !error) {
        setPuntosEncuentro(data);
      }
    } catch (error) {
      console.error("Error cargando puntos de encuentro:", error);
    }
  };

  const cargarMensajesComunidad = async () => {
    if (!supabase) return;

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
        .limit(10);

      if (data && !error) {
        setMensajesComunidad(data);
      }
    } catch (error) {
      console.error("Error cargando mensajes de la comunidad:", error);
    }
  };

  const eliminarMensaje = async (mensajeId: string) => {
    if (APP_CONFIG.demoReadOnly) {
      alert("Modo demo: la moderación está deshabilitada (solo lectura).");
      return;
    }

    if (!supabase) return;

    const confirmar = window.confirm(
      "¿Estás seguro de que quieres eliminar este mensaje?"
    );
    if (!confirmar) return;

    setLoadingMensajes(true);
    try {
      const { error } = await supabase
        .from("avisos_comunidad")
        .update({ estado: "inactivo" }) // Cambiar a 'inactivo' temporalmente
        .eq("id", mensajeId);

      if (error) {
        console.error("Error eliminando mensaje:", error);
        alert("Error al eliminar el mensaje");
        return;
      }

      // Recargar mensajes
      await cargarMensajesComunidad();
      console.log("✅ Mensaje eliminado correctamente");
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar el mensaje");
    } finally {
      setLoadingMensajes(false);
    }
  };

  const calcularTiempoTranscurrido = (fechaISO: string) => {
    const ahora = new Date();
    const fecha = new Date(fechaISO);
    const diferencia = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) return `${dias}d`;
    if (horas > 0) return `${horas}h`;
    return `${minutos}m`;
  };

  const cambiarEstadoPunto = async (puntoId: string, nuevoEstado: boolean) => {
    if (APP_CONFIG.demoReadOnly) {
      alert("Modo demo: no se puede modificar el estado de puntos.");
      return;
    }

    if (!supabase) return;

    if (!puntoId) {
      console.error("ID de punto no válido");
      return;
    }

    setLoadingPuntos(true);
    try {
      const { error } = await supabase
        .from("puntos_encuentro")
        .update({ ocupado: nuevoEstado })
        .eq("id", puntoId);

      if (error) {
        console.error("Error en Supabase:", error);
        throw error;
      }

      // Recargar puntos
      await cargarPuntosEncuentro();
      onAlertChange?.(); // Notificar cambio para refrescar el mapa
    } catch (error) {
      console.error("Error cambiando estado del punto:", error);
    } finally {
      setLoadingPuntos(false);
    }
  };

  const resetearTodosPuntos = async () => {
    if (APP_CONFIG.demoReadOnly) {
      alert("Modo demo: no se pueden resetear puntos.");
      return;
    }

    if (!supabase) return;

    setLoadingPuntos(true);
    try {
      // Actualizar todos los puntos a ocupado = false
      const { error } = await supabase
        .from("puntos_encuentro")
        .update({ ocupado: false })
        .gte("capacidad", 0); // Condición simple que siempre será verdadera

      if (error) {
        console.error("Error en Supabase:", error);
        throw error;
      }

      await cargarPuntosEncuentro();
      onAlertChange?.();
    } catch (error) {
      console.error("Error reseteando puntos:", error);
    } finally {
      setLoadingPuntos(false);
    }
  };

  const cambiarNivelAlerta = async (nuevoNivel: string) => {
    if (APP_CONFIG.demoReadOnly) {
      alert("Modo demo: el cambio de nivel está deshabilitado.");
      return;
    }

    if (!supabase) return;

    setLoading(true);
    try {
      // Generar parámetros simulados según el nivel
      const nuevosParametros = generarParametrosPorNivel(nuevoNivel);

      // Actualizar parámetros del volcán
      const { data: parametrosData, error: parametrosError } = await supabase
        .from("parametros_volcan")
        .insert([nuevosParametros])
        .select()
        .single();

      if (parametrosError) {
        throw parametrosError;
      }

      // Crear nueva alerta
      const descripcion = generarDescripcionPorNivel(nuevoNivel);
      const { error: alertaError } = await supabase
        .from("alertas_volcan")
        .insert([
          {
            nivel_alerta: nuevoNivel,
            descripcion,
            parametros_id: parametrosData.id,
            volcan_id: (
              await supabase
                .from("informacion_volcan")
                .select("id")
                .limit(1)
                .single()
            ).data?.id,
          },
        ]);

      if (alertaError) {
        throw alertaError;
      }

      setCurrentLevel(nuevoNivel);
      setParametros(nuevosParametros);

      // Notificar al componente padre que hubo un cambio
      onAlertChange?.();

      alert(`✅ Nivel de alerta cambiado a: ${nuevoNivel.toUpperCase()}`);
    } catch (error) {
      console.error("Error cambiando nivel:", error);
      alert("❌ Error al cambiar el nivel de alerta");
    } finally {
      setLoading(false);
    }
  };

  const generarParametrosPorNivel = (nivel: string) => {
    switch (nivel) {
      case "verde":
        return {
          sismos_24h: Math.floor(Math.random() * 20) + 5, // 5-25
          temperatura_crater: `${Math.floor(Math.random() * 100) + 700}°C`, // 700-800°C
          emision_so2: `${Math.floor(Math.random() * 500) + 800} ton/día`, // 800-1300
          deformacion: `${(Math.random() * 1 + 0.5).toFixed(1)} cm/mes`, // 0.5-1.5
        };
      case "amarillo":
        return {
          sismos_24h: Math.floor(Math.random() * 30) + 30, // 30-60
          temperatura_crater: `${Math.floor(Math.random() * 150) + 800}°C`, // 800-950°C
          emision_so2: `${Math.floor(Math.random() * 800) + 1000} ton/día`, // 1000-1800
          deformacion: `${(Math.random() * 2 + 1.5).toFixed(1)} cm/mes`, // 1.5-3.5
        };
      case "naranja":
        return {
          sismos_24h: Math.floor(Math.random() * 50) + 60, // 60-110
          temperatura_crater: `${Math.floor(Math.random() * 200) + 950}°C`, // 950-1150°C
          emision_so2: `${Math.floor(Math.random() * 1500) + 1800} ton/día`, // 1800-3300
          deformacion: `${(Math.random() * 3 + 3).toFixed(1)} cm/mes`, // 3-6
        };
      case "rojo":
        return {
          sismos_24h: Math.floor(Math.random() * 100) + 100, // 100-200
          temperatura_crater: `${Math.floor(Math.random() * 300) + 1100}°C`, // 1100-1400°C
          emision_so2: `${Math.floor(Math.random() * 5000) + 3000} ton/día`, // 3000-8000
          deformacion: `${(Math.random() * 5 + 5).toFixed(1)} cm/mes`, // 5-10
        };
      default:
        return parametros;
    }
  };

  const generarDescripcionPorNivel = (nivel: string) => {
    const descripciones = {
      verde:
        "Actividad volcánica normal. Parámetros dentro de los rangos esperados. Monitoreo rutinario activo.",
      amarillo:
        "Actividad volcánica moderada. Se registra actividad sísmica constante y emisiones de gases. Temperatura del cráter en aumento. Monitoreo continuo activo.",
      naranja:
        "Actividad volcánica alta. Incremento significativo en todos los parámetros. Posible escalamiento a emergencia. Evacuación preventiva recomendada.",
      rojo: "🚨 EMERGENCIA VOLCÁNICA 🚨 Erupción inminente o en curso. Evacuación inmediata obligatoria. Peligro extremo para la población.",
    };
    return descripciones[nivel as keyof typeof descripciones] || "";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">
              Panel de Administración - Simulador de Alertas
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {APP_CONFIG.demoReadOnly && (
            <div className="rounded-md border border-yellow-700 bg-yellow-900/20 p-3 text-sm text-yellow-200">
              Modo demo activo: las acciones de edición están bloqueadas.
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">
              Usa este panel para simular cambios en el nivel de alerta del
              volcán
            </p>
            {currentLevel && (
              <Badge
                className={`${
                  niveles.find((n) => n.nivel === currentLevel)?.color
                } text-white px-3 py-1`}
              >
                Nivel Actual: {currentLevel.toUpperCase()}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {niveles.map((nivel) => {
              const Icon = nivel.icon;
              const isActive = currentLevel === nivel.nivel;

              return (
                <Button
                  key={nivel.nivel}
                  onClick={() => cambiarNivelAlerta(nivel.nivel)}
                  disabled={loading || isActive || APP_CONFIG.demoReadOnly}
                  className={`
                    h-auto p-4 flex flex-col items-center space-y-2 transition-all
                    ${
                      isActive
                        ? `${nivel.color} text-white shadow-lg scale-105`
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600"
                    }
                  `}
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-bold">{nivel.label}</div>
                    <div className="text-xs opacity-90">
                      {nivel.descripcion}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">
              Parámetros Actuales Simulados:
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Sismos 24h:</span>
                <span className="text-white ml-2">{parametros.sismos_24h}</span>
              </div>
              <div>
                <span className="text-gray-400">Temperatura:</span>
                <span className="text-white ml-2">
                  {parametros.temperatura_crater}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Emisión SO2:</span>
                <span className="text-white ml-2">
                  {parametros.emision_so2}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Deformación:</span>
                <span className="text-white ml-2">
                  {parametros.deformacion}
                </span>
              </div>
            </div>
          </div>

          {/* Gestión de Puntos de Encuentro */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-500" />
                Gestión de Puntos de Encuentro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">
                  Total: {puntosEncuentro.length} puntos
                </span>
                <Button
                  onClick={resetearTodosPuntos}
                  disabled={loadingPuntos || APP_CONFIG.demoReadOnly}
                  size="sm"
                  variant="outline"
                  className="border-green-700 text-green-400 hover:bg-green-900/20"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Resetear Todos
                </Button>
              </div>

              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {puntosEncuentro.map((punto) => (
                  <div
                    key={punto.id}
                    className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">
                        {punto.nombre}
                      </div>
                      <div className="text-xs text-gray-400">
                        Capacidad: {punto.capacidad} personas
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`${
                          punto.ocupado
                            ? "bg-red-600 text-white"
                            : "bg-green-600 text-white"
                        }`}
                      >
                        {punto.ocupado ? "LLENO" : "DISPONIBLE"}
                      </Badge>

                      <Button
                        onClick={() =>
                          cambiarEstadoPunto(punto.id, !punto.ocupado)
                        }
                        disabled={loadingPuntos || APP_CONFIG.demoReadOnly}
                        size="sm"
                        className={`${
                          punto.ocupado
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-red-600 hover:bg-red-700"
                        } text-white`}
                      >
                        {punto.ocupado ? "Liberar" : "Marcar Lleno"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {loadingPuntos && (
                <div className="text-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-400 mt-1">
                    Actualizando puntos...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gestión de Mensajes de la Comunidad */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-green-500" />
                  Gestión de Mensajes de la Comunidad
                </div>
                <Badge
                  variant="outline"
                  className="border-green-800 text-green-400 bg-green-900/20"
                >
                  {mensajesComunidad.length} mensajes
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {mensajesComunidad.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">
                    No hay mensajes recientes
                  </p>
                ) : (
                  mensajesComunidad.map((mensaje) => (
                    <div
                      key={mensaje.id}
                      className="bg-gray-900 border border-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-white">
                              {mensaje.usuarios?.nombre || "Usuario"}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {calcularTiempoTranscurrido(
                                mensaje.fecha_creacion
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {mensaje.mensaje}
                          </p>
                        </div>
                        <Button
                          onClick={() => eliminarMensaje(mensaje.id)}
                          disabled={loadingMensajes || APP_CONFIG.demoReadOnly}
                          size="sm"
                          variant="outline"
                          className="ml-3 border-red-800 text-red-400 hover:bg-red-900/20 hover:border-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {loadingMensajes && (
                <div className="text-center mt-4">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-400 mt-1">
                    Actualizando mensajes...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">
              💡 Instrucciones:
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Haz clic en cualquier nivel para cambiar la alerta</li>
              <li>
                • Los parámetros se generan automáticamente según el nivel
              </li>
              <li>
                • Marca puntos como &quot;Lleno&quot; cuando alcancen su
                capacidad
              </li>
              <li>• Los puntos llenos aparecerán en rojo en el mapa</li>
              <li>
                • Usa el botón <Trash2 className="h-3 w-3 inline mx-1" /> para
                eliminar mensajes inapropiados
              </li>
              <li>
                • Los cambios se reflejan inmediatamente en toda la aplicación
              </li>
              <li>
                • Presiona{" "}
                <kbd className="bg-gray-700 px-1 rounded">Ctrl+Shift+A</kbd>{" "}
                para abrir este panel
              </li>
            </ul>
          </div>

          {loading && (
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-400 mt-2">
                Actualizando nivel de alerta...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
