"use client";

import { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  Clock,
  Activity,
  Thermometer,
  TrendingUp,
  Shield,
  X,
  Users,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  supabase,
  type AlertaVolcan,
  type ParametrosVolcan,
  type ConfiguracionNivel,
  type RecomendacionNivel,
  type ZonaExclusion,
  type AccionRequerida,
  type InformacionVolcan,
} from "@/lib/supabase";

// Extend Window interface for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface VolcanoStatusComplete {
  alerta: AlertaVolcan;
  parametros: ParametrosVolcan;
  configuracion: ConfiguracionNivel;
  recomendaciones: RecomendacionNivel[];
  zona_exclusion: ZonaExclusion;
  acciones_requeridas: AccionRequerida;
  informacion_volcan: InformacionVolcan;
}

interface VolcanoStatusBannerProps {
  onOpenCommunity?: () => void;
}

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case "Shield":
      return Shield;
    case "Activity":
      return Activity;
    case "TrendingUp":
      return TrendingUp;
    case "AlertTriangle":
      return AlertTriangle;
    default:
      return Activity;
  }
};

const formatearFecha = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
};

const calcularTiempoTranscurrido = (fechaISO: string) => {
  const ahora = new Date();
  const fecha = new Date(fechaISO);
  const diferencia = ahora.getTime() - fecha.getTime();
  const horas = Math.floor(diferencia / (1000 * 60 * 60));
  const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

  if (horas > 0) {
    return `Hace ${horas}h ${minutos}m`;
  }
  return `Hace ${minutos}m`;
};

// Función para crear sonidos de alerta usando Web Audio API
const createAlertSound = (type: "naranja" | "rojo") => {
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    const playBeep = (frequency: number, duration: number, delay = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime
        );
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(
          0.3,
          audioContext.currentTime + 0.01
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + duration
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      }, delay);
    };

    if (type === "naranja") {
      playBeep(800, 0.3, 0);
      playBeep(1000, 0.3, 400);
      playBeep(1200, 0.3, 800);
    } else if (type === "rojo") {
      for (let i = 0; i < 6; i++) {
        playBeep(i % 2 === 0 ? 1000 : 1500, 0.25, i * 300);
      }
    }
  } catch (error) {
    console.warn("No se pudo reproducir el sonido de alerta:", error);
  }
};

export default function VolcanoStatusBanner({
  onOpenCommunity,
}: VolcanoStatusBannerProps) {
  const [volcanoData, setVolcanoData] = useState<VolcanoStatusComplete | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const previousLevelRef = useRef<string | null>(null);

  // Función para reproducir sonido de alerta
  const playAlertSound = (nivel: "naranja" | "rojo") => {
    if (!soundEnabled) return;

    setIsPlayingSound(true);
    createAlertSound(nivel);

    setTimeout(
      () => {
        setIsPlayingSound(false);
      },
      nivel === "naranja" ? 1200 : 1800
    );
  };

  // Función para cargar datos completos del volcán desde la base de datos
  const cargarDatosVolcan = async () => {
    try {
      // Cargar alerta actual
      const { data: alerta, error: errorAlerta } = await supabase
        .from("alertas_volcan")
        .select("*")
        .order("ultima_actualizacion", { ascending: false })
        .limit(1)
        .single();

      if (errorAlerta || !alerta) {
        console.error("Error cargando alerta:", errorAlerta);
        return null;
      }

      // Cargar parámetros del volcán
      const { data: parametros, error: errorParametros } = await supabase
        .from("parametros_volcan")
        .select("*")
        .eq("id", alerta.parametros_id)
        .single();

      if (errorParametros || !parametros) {
        console.error("Error cargando parámetros:", errorParametros);
        return null;
      }

      // Cargar configuración del nivel
      const { data: configuracion, error: errorConfig } = await supabase
        .from("configuraciones_nivel")
        .select("*")
        .eq("nivel", alerta.nivel_alerta)
        .single();

      if (errorConfig || !configuracion) {
        console.error("Error cargando configuración:", errorConfig);
        return null;
      }

      // Cargar recomendaciones
      const { data: recomendaciones, error: errorRecomendaciones } =
        await supabase
          .from("recomendaciones_nivel")
          .select("*")
          .eq("nivel", alerta.nivel_alerta)
          .order("orden");

      if (errorRecomendaciones) {
        console.error("Error cargando recomendaciones:", errorRecomendaciones);
        return null;
      }

      // Cargar zona de exclusión
      const { data: zonaExclusion, error: errorZona } = await supabase
        .from("zonas_exclusion")
        .select("*")
        .eq("nivel_alerta", alerta.nivel_alerta)
        .single();

      if (errorZona || !zonaExclusion) {
        console.error("Error cargando zona de exclusión:", errorZona);
        return null;
      }

      // Cargar acciones requeridas
      const { data: accionesRequeridas, error: errorAcciones } = await supabase
        .from("acciones_requeridas")
        .select("*")
        .eq("nivel_alerta", alerta.nivel_alerta)
        .single();

      if (errorAcciones || !accionesRequeridas) {
        console.error("Error cargando acciones requeridas:", errorAcciones);
        return null;
      }

      // Cargar información del volcán
      const { data: informacionVolcan, error: errorVolcan } = await supabase
        .from("informacion_volcan")
        .select("*")
        .eq("id", alerta.volcan_id)
        .single();

      if (errorVolcan || !informacionVolcan) {
        console.error("Error cargando información del volcán:", errorVolcan);
        return null;
      }

      return {
        alerta,
        parametros,
        configuracion,
        recomendaciones: recomendaciones || [],
        zona_exclusion: zonaExclusion,
        acciones_requeridas: accionesRequeridas,
        informacion_volcan: informacionVolcan,
      };
    } catch (error) {
      console.error("Error general cargando datos:", error);
      return null;
    }
  };

  // Simular cambio de nivel de alerta
  const simularCambioNivel = async (
    nuevoNivel: "verde" | "amarillo" | "naranja" | "rojo"
  ) => {
    if (!volcanoData) return;

    try {
      // Actualizar parámetros según el nivel
      const parametrosConfig = {
        verde: {
          sismos_24h: 12,
          temperatura_crater: "650°C",
          emision_so2: "400 ton/día",
          deformacion: "0.8 cm/mes",
        },
        amarillo: {
          sismos_24h: 45,
          temperatura_crater: "850°C",
          emision_so2: "1,200 ton/día",
          deformacion: "2.3 cm/mes",
        },
        naranja: {
          sismos_24h: 127,
          temperatura_crater: "1,150°C",
          emision_so2: "3,800 ton/día",
          deformacion: "8.7 cm/mes",
        },
        rojo: {
          sismos_24h: 285,
          temperatura_crater: "1,400°C",
          emision_so2: "8,500 ton/día",
          deformacion: "15.2 cm/mes",
        },
      };

      const descripcionConfig = {
        verde:
          "Actividad volcánica normal. Parámetros dentro de rangos normales. Monitoreo rutinario activo.",
        amarillo:
          "Actividad volcánica moderada. Se registra actividad sísmica constante y emisiones de gases. Temperatura del cráter en aumento. Monitoreo continuo activo.",
        naranja:
          "Actividad volcánica alta - Alerta de evacuación. Incremento significativo en actividad sísmica y emisiones. Temperatura del cráter en aumento considerable. Posible erupción en las próximas horas.",
        rojo: "EMERGENCIA VOLCÁNICA - Erupción inminente. ERUPCIÓN INMINENTE O EN CURSO. Evacuación inmediata obligatoria. Actividad sísmica extrema y emisiones masivas de gases.",
      };

      const config = parametrosConfig[nuevoNivel];
      const descripcion = descripcionConfig[nuevoNivel];

      // Actualizar parámetros en la base de datos
      const { error: errorParametros } = await supabase
        .from("parametros_volcan")
        .update({
          ...config,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq("id", volcanoData.parametros.id);

      if (errorParametros) {
        console.error("Error actualizando parámetros:", errorParametros);
        return;
      }

      // Actualizar alerta en la base de datos
      const { error: errorAlerta } = await supabase
        .from("alertas_volcan")
        .update({
          nivel_alerta: nuevoNivel,
          descripcion: descripcion,
          ultima_actualizacion: new Date().toISOString(),
        })
        .eq("id", volcanoData.alerta.id);

      if (errorAlerta) {
        console.error("Error actualizando alerta:", errorAlerta);
        return;
      }

      // Recargar datos
      const nuevosDatos = await cargarDatosVolcan();
      if (nuevosDatos) {
        setVolcanoData(nuevosDatos);
        setAlertDismissed(false);

        const previousLevel = previousLevelRef.current;
        if (
          (nuevoNivel === "naranja" || nuevoNivel === "rojo") &&
          previousLevel !== nuevoNivel
        ) {
          playAlertSound(nuevoNivel);
        }

        previousLevelRef.current = nuevoNivel;

        if (nuevoNivel === "naranja" || nuevoNivel === "rojo") {
          setShowCriticalAlert(true);
        }
      }
    } catch (error) {
      console.error("Error simulando cambio de nivel:", error);
    }
  };

  useEffect(() => {
    const loadVolcanoData = async () => {
      const data = await cargarDatosVolcan();
      if (data) {
        setVolcanoData(data);
        previousLevelRef.current = data.alerta.nivel_alerta;

        if (
          (data.alerta.nivel_alerta === "naranja" ||
            data.alerta.nivel_alerta === "rojo") &&
          !alertDismissed
        ) {
          setShowCriticalAlert(true);
        }
      }
      setLoading(false);
    };

    loadVolcanoData();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel("volcano_status_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alertas_volcan" },
        () => {
          loadVolcanoData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parametros_volcan" },
        () => {
          loadVolcanoData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [alertDismissed]);

  if (loading) {
    return (
      <div className="bg-black border-b border-gray-800 animate-pulse">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="h-16 bg-gray-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!volcanoData) return null;

  const {
    alerta,
    parametros,
    configuracion,
    recomendaciones,
    zona_exclusion,
    acciones_requeridas,
    informacion_volcan,
  } = volcanoData;
  const IconComponent = getIconComponent(configuracion.icon_name);
  const esCritico =
    alerta.nivel_alerta === "naranja" || alerta.nivel_alerta === "rojo";

  return (
    <>
      {/* Banner Principal */}
      <div
        className={`border-b border-gray-800 bg-gradient-to-r ${configuracion.bg_gradient} relative overflow-hidden`}
      >
        {esCritico && (
          <div
            className={`absolute inset-0 animate-pulse bg-gradient-to-r ${configuracion.bg_gradient} opacity-50`}
          ></div>
        )}

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div
                className={`p-4 rounded-full ${configuracion.color} ${
                  esCritico
                    ? `animate-pulse shadow-lg ${configuracion.pulse_color}`
                    : ""
                }`}
              >
                <IconComponent
                  className={`h-6 w-6 ${configuracion.text_color}`}
                />
              </div>
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  <h2 className="text-2xl font-semibold text-white">
                    Volcán {informacion_volcan.nombre}
                  </h2>
                  <Badge
                    className={`${configuracion.color} ${
                      configuracion.text_color
                    } font-medium ${esCritico ? "animate-pulse" : ""}`}
                  >
                    {configuracion.label}
                  </Badge>
                  {isPlayingSound && (
                    <Badge
                      variant="outline"
                      className="border-red-800 text-red-400 bg-red-900/20 animate-pulse"
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      ALERTA SONORA
                    </Badge>
                  )}
                </div>
                <p className="text-gray-300 font-medium mb-1">
                  {configuracion.descripcion_corta}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      Actualizado{" "}
                      {calcularTiempoTranscurrido(alerta.ultima_actualizacion)}
                    </span>
                  </div>
                  <span>•</span>
                  <span>SERNAGEOMIN - OVDAS</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center space-x-8">
              <div className="text-center">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Sismos 24h</span>
                </div>
                <p className="text-2xl font-semibold text-white">
                  {parametros.sismos_24h}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <Thermometer className="h-4 w-4" />
                  <span className="text-sm font-medium">Temperatura</span>
                </div>
                <p
                  className={`text-2xl font-semibold text-white ${
                    esCritico ? "text-3xl" : ""
                  }`}
                >
                  {parametros.temperatura_crater}
                </p>
              </div>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-xl transition-colors ${
                  soundEnabled
                    ? "bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700"
                }`}
                title={
                  soundEnabled
                    ? "Desactivar sonidos de alerta"
                    : "Activar sonidos de alerta"
                }
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-gray-700 hover:border-gray-600 text-white"
                  >
                    Ver Detalles
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl bg-gray-900 border-gray-800">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-3 text-2xl text-white">
                      <IconComponent className="h-6 w-6" />
                      <span>
                        Estado Detallado - Volcán {informacion_volcan.nombre}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Información completa sobre la actividad volcánica actual
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    <Card className="border-gray-800 bg-black">
                      <CardHeader>
                        <CardTitle className="text-white">
                          Estado Actual
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">
                            Nivel de Alerta:
                          </span>
                          <Badge
                            className={`${configuracion.color} ${configuracion.text_color}`}
                          >
                            {configuracion.label}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">
                            Descripción:
                          </span>
                          <p className="text-white mt-1">
                            {alerta.descripcion}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">
                            Última Actualización:
                          </span>
                          <span className="text-white text-sm">
                            {formatearFecha(alerta.ultima_actualizacion)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-gray-800 bg-black">
                      <CardHeader>
                        <CardTitle className="text-white">
                          Parámetros de Monitoreo
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <span className="text-gray-400 text-sm">
                              Sismos (24h):
                            </span>
                            <p className="text-white font-semibold text-lg">
                              {parametros.sismos_24h}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">
                              Temperatura del Cráter:
                            </span>
                            <p className="text-white font-semibold text-lg">
                              {parametros.temperatura_crater}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">
                              Emisión SO₂:
                            </span>
                            <p className="text-white font-semibold text-lg">
                              {parametros.emision_so2}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">
                              Deformación:
                            </span>
                            <p className="text-white font-semibold text-lg">
                              {parametros.deformacion}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-gray-800 bg-black">
                      <CardHeader>
                        <CardTitle className="text-white">
                          Recomendaciones
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {recomendaciones.map((recomendacion) => (
                            <li
                              key={recomendacion.id}
                              className="flex items-start space-x-3"
                            >
                              <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="text-gray-300">
                                {recomendacion.recomendacion}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-gray-800 bg-black">
                      <CardHeader>
                        <CardTitle className="text-white">
                          Zona de Exclusión
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400">Radio:</span>
                          <span className="text-white font-semibold text-lg">
                            {zona_exclusion.radio_km} km
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          {zona_exclusion.descripcion}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Simulador de niveles de alerta */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-6">
          <div className="flex items-center justify-center space-x-3">
            <span className="text-gray-400 text-sm mr-3">Simular nivel:</span>
            <button
              onClick={() => simularCambioNivel("verde")}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
            >
              Verde
            </button>
            <button
              onClick={() => simularCambioNivel("amarillo")}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"
            >
              Amarillo
            </button>
            <button
              onClick={() => simularCambioNivel("naranja")}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
            >
              Naranja 🔊
            </button>
            <button
              onClick={() => simularCambioNivel("rojo")}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              Rojo 🚨
            </button>
          </div>

          {soundEnabled && (
            <div className="text-center mt-3">
              <span className="text-sm text-gray-400">
                🔊 Sonidos de alerta activados para niveles críticos
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Popup de Alerta Crítica */}
      {showCriticalAlert && !alertDismissed && esCritico && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-3xl p-8 max-w-md w-full shadow-2xl animate-pulse border border-red-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-3 rounded-full ${configuracion.color} animate-pulse`}
                >
                  <AlertCircle
                    className={`h-6 w-6 ${configuracion.text_color}`}
                  />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {alerta.nivel_alerta === "rojo"
                    ? "🚨 EMERGENCIA VOLCÁNICA"
                    : "⚠️ ALERTA VOLCÁNICA"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCriticalAlert(false);
                  setAlertDismissed(true);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <Alert className={`mb-6 bg-gray-900 border-gray-800 border`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-white">
                Volcán {informacion_volcan.nombre} - {configuracion.label}
              </AlertTitle>
              <AlertDescription className="text-gray-300">
                {configuracion.descripcion_corta}
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mb-8">
              <p className="text-gray-300">{alerta.descripcion}</p>

              {acciones_requeridas.evacuar_zona_riesgo && (
                <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
                  <p className="text-red-400 font-semibold text-sm">
                    🚨 EVACUACIÓN REQUERIDA: Si te encuentras en zona de riesgo,
                    evacúa inmediatamente.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {acciones_requeridas.activar_red_comunitaria && (
                <Button
                  onClick={() => {
                    onOpenCommunity?.();
                    setShowCriticalAlert(false);
                    setAlertDismissed(true);
                  }}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-xl border border-gray-700"
                  size="lg"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Activar Red Comunitaria
                </Button>
              )}

              <Button
                onClick={() => {
                  setShowCriticalAlert(false);
                  setAlertDismissed(true);
                }}
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl"
                size="lg"
              >
                Entendido
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-6 text-center">
              Mantente informado y sigue las instrucciones de las autoridades
            </p>
          </div>
        </div>
      )}
    </>
  );
}
