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
  const [soundInterval, setSoundInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [emergencyMode, setEmergencyMode] = useState(false);
  const previousLevelRef = useRef<string | null>(null);

  // Datos de emergencia falsos para pruebas
  const emergencyData = {
    alerta: {
      id: "emergency-test",
      nivel_alerta: "rojo",
      descripcion:
        "🚨 EMERGENCIA VOLCÁNICA DE PRUEBA - Erupción inminente. Evacuación inmediata obligatoria.",
      ultima_actualizacion: new Date().toISOString(),
      parametros_id: "test",
      volcan_id: "test",
    },
    parametros: {
      id: "test",
      sismos_24h: 285,
      temperatura_crater: "1,400°C",
      emision_so2: "8,500 ton/día",
      deformacion: "15.2 cm/mes",
      fecha_actualizacion: new Date().toISOString(),
    },
    configuracion: {
      id: "test",
      nivel: "rojo",
      color: "bg-red-600",
      text_color: "text-white",
      bg_gradient: "from-red-900/30 to-red-900/10",
      icon_name: "AlertTriangle",
      label: "EMERGENCIA",
      descripcion_corta: "Erupción inminente o en curso",
      urgencia: "crítica",
      pulse_color: "shadow-red-500/80",
    },
    recomendaciones: [
      {
        id: "1",
        nivel: "rojo",
        recomendacion: "Evacuar inmediatamente la zona de peligro",
        orden: 1,
      },
      {
        id: "2",
        nivel: "rojo",
        recomendacion: "Seguir rutas de evacuación establecidas",
        orden: 2,
      },
      {
        id: "3",
        nivel: "rojo",
        recomendacion: "Mantener comunicación con autoridades",
        orden: 3,
      },
    ],
    zona_exclusion: {
      id: "test",
      nivel_alerta: "rojo",
      radio_km: 20,
      descripcion: "Zona de exclusión total de 20 km del volcán",
    },
    acciones_requeridas: {
      id: "test",
      nivel_alerta: "rojo",
      evacuar_zona_riesgo: true,
      activar_red_comunitaria: true,
      revisar_rutas_evacuacion: true,
      preparar_kit_emergencia: true,
    },
    informacion_volcan: {
      id: "test",
      nombre: "Villarrica",
      codigo: "VIL",
      altura_msnm: 2847,
      latitud: -39.42,
      longitud: -71.93,
      descripcion: "Volcán activo en la Región de la Araucanía",
      activo: true,
    },
  };

  // Función para reproducir sonido de alerta con repetición
  const playAlertSound = (nivel: "naranja" | "rojo") => {
    console.log("🎵 Reproduciendo sonido:", nivel);
    if (!soundEnabled) return;

    setIsPlayingSound(true);
    createAlertSound(nivel);

    // Limpiar intervalo anterior
    if (soundInterval) {
      clearInterval(soundInterval);
    }

    // Repetir sonido cada cierto tiempo
    const interval = setInterval(
      () => {
        if (showCriticalAlert && !alertDismissed && soundEnabled) {
          createAlertSound(nivel);
        } else {
          clearInterval(interval);
          setIsPlayingSound(false);
        }
      },
      nivel === "naranja" ? 4000 : 3000
    );

    setSoundInterval(interval);

    setTimeout(
      () => {
        if (!showCriticalAlert || alertDismissed) {
          setIsPlayingSound(false);
        }
      },
      nivel === "naranja" ? 1500 : 2000
    );
  };

  // Función para detener sonido
  const stopAlertSound = () => {
    if (soundInterval) {
      clearInterval(soundInterval);
      setSoundInterval(null);
    }
    setIsPlayingSound(false);
  };

  // Función para forzar emergencia
  const forceEmergency = () => {
    console.log("🚨 FORZANDO EMERGENCIA!");
    setEmergencyMode(true);
    setVolcanoData(emergencyData as any);
    setAlertDismissed(false);
    setShowCriticalAlert(true);

    setTimeout(() => {
      playAlertSound("rojo");
    }, 500);
  };

  // Función para cargar datos completos del volcán desde la base de datos
  const cargarDatosVolcan = async () => {
    console.log("📡 Iniciando carga de datos...");

    if (!supabase) {
      console.error("❌ Cliente de Supabase no disponible");
      return null;
    }

    try {
      console.log("🔍 Consultando alertas...");
      // Cargar alerta actual
      const { data: alerta, error: errorAlerta } = await supabase
        .from("alertas_volcan")
        .select("*")
        .order("ultima_actualizacion", { ascending: false })
        .limit(1)
        .single();

      console.log("📋 Resultado alerta:", { alerta, errorAlerta });

      if (errorAlerta || !alerta) {
        console.error("❌ Error cargando alerta:", errorAlerta);
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
    if (!volcanoData) {
      console.log("❌ No hay datos del volcán disponibles");
      return;
    }

    if (!supabase) {
      console.log("❌ Cliente de Supabase no disponible");
      return;
    }

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
        console.log("🔄 Simulación completada:", {
          nuevoNivel,
          previousLevel,
          cambioDetectado:
            (nuevoNivel === "naranja" || nuevoNivel === "rojo") &&
            previousLevel !== nuevoNivel,
        });

        if (
          (nuevoNivel === "naranja" || nuevoNivel === "rojo") &&
          previousLevel !== nuevoNivel
        ) {
          console.log("🎵 Reproduciendo sonido por cambio de nivel");
          playAlertSound(nuevoNivel);
        }

        previousLevelRef.current = nuevoNivel;

        if (nuevoNivel === "naranja" || nuevoNivel === "rojo") {
          console.log("🚨 Mostrando modal de emergencia");
          setShowCriticalAlert(true);
        } else {
          console.log("✅ Cerrando modal (nivel no crítico)");
          setShowCriticalAlert(false);
        }
      }
    } catch (error) {
      console.error("Error simulando cambio de nivel:", error);
    }
  };

  useEffect(() => {
    console.log("🚀 useEffect iniciando carga de datos...");

    const loadVolcanoData = async () => {
      console.log("📊 Cargando datos del volcán...");
      const data = await cargarDatosVolcan();

      if (data) {
        console.log("✅ Datos cargados:", {
          nivel: data.alerta.nivel_alerta,
          descripcion: data.alerta.descripcion,
        });

        setVolcanoData(data);
        previousLevelRef.current = data.alerta.nivel_alerta;

        // Verificar si es nivel crítico
        const esCritico =
          data.alerta.nivel_alerta === "naranja" ||
          data.alerta.nivel_alerta === "rojo";

        console.log("🔍 Verificando nivel crítico:", {
          nivel: data.alerta.nivel_alerta,
          esCritico,
          alertDismissed,
        });

        if (esCritico && !alertDismissed) {
          console.log(
            "🚨 NIVEL CRÍTICO DETECTADO! Mostrando modal y reproduciendo sonido"
          );
          setShowCriticalAlert(true);

          // Reproducir sonido después de un pequeño delay
          setTimeout(() => {
            console.log("🎵 Iniciando reproducción de sonido...");
            playAlertSound(data.alerta.nivel_alerta as "naranja" | "rojo");
          }, 1000);
        } else {
          console.log("ℹ️ Nivel no crítico o alerta ya fue cerrada");
        }
      } else {
        console.log("❌ No se pudieron cargar los datos del volcán");
      }
      setLoading(false);
    };

    loadVolcanoData();

    // Suscribirse a cambios en tiempo real solo si supabase está disponible
    let subscription: any = null;

    if (supabase) {
      subscription = supabase
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
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      stopAlertSound(); // Limpiar sonidos al desmontar
    };
  }, [alertDismissed]);

  // useEffect para manejar modo de emergencia
  useEffect(() => {
    if (emergencyMode && volcanoData) {
      console.log("🚨 Modo emergencia activado - forzando modal");
      setShowCriticalAlert(true);
      setAlertDismissed(false);

      setTimeout(() => {
        playAlertSound("rojo");
      }, 1000);
    }
  }, [emergencyMode, volcanoData]);

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
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="text-gray-400 text-sm mr-3">Simular nivel:</span>
            <button
              onClick={() => {
                console.log("🟢 Simulando nivel VERDE");
                simularCambioNivel("verde");
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
            >
              Verde
            </button>
            <button
              onClick={() => {
                console.log("🟡 Simulando nivel AMARILLO");
                simularCambioNivel("amarillo");
              }}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"
            >
              Amarillo
            </button>
            <button
              onClick={() => {
                console.log("🟠 Simulando nivel NARANJA");
                simularCambioNivel("naranja");
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
            >
              Naranja 🔊
            </button>
            <button
              onClick={() => {
                console.log("🔴 Simulando nivel ROJO");
                simularCambioNivel("rojo");
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              Rojo 🚨
            </button>
          </div>

          {/* Botones de prueba */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={forceEmergency}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors shadow-lg animate-pulse"
            >
              🚨 ACTIVAR EMERGENCIA AHORA
            </button>
            <button
              onClick={() => {
                console.log("🧪 Probando modal simple");
                setAlertDismissed(false);
                setShowCriticalAlert(true);
                setTimeout(() => {
                  createAlertSound("rojo");
                }, 500);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
            >
              🧪 Modal Simple
            </button>
            <button
              onClick={() => {
                console.log("🔄 Reseteando todo");
                setEmergencyMode(false);
                setAlertDismissed(false);
                setShowCriticalAlert(false);
                setIsPlayingSound(false);
                stopAlertSound();
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              🔄 Reset Todo
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

      {/* Popup de Alerta Crítica - SIMPLIFICADO PARA DEBUG */}
      {showCriticalAlert && !alertDismissed && volcanoData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-red-950 to-black rounded-3xl p-8 max-w-lg w-full shadow-2xl border-2 border-red-500 animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-4 rounded-full bg-red-600 animate-bounce">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {volcanoData.alerta.nivel_alerta === "rojo"
                      ? "🚨 EMERGENCIA VOLCÁNICA"
                      : "⚠️ ALERTA VOLCÁNICA"}
                  </h3>
                  <p className="text-red-400 text-sm">
                    Nivel: {volcanoData.alerta.nivel_alerta.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  console.log("❌ Cerrando modal de emergencia");
                  setShowCriticalAlert(false);
                  setAlertDismissed(true);
                  setIsPlayingSound(false);
                }}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <Alert className="mb-6 bg-red-900/30 border-red-600 border-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <AlertTitle className="text-white text-lg font-bold">
                Volcán {volcanoData.informacion_volcan.nombre} -{" "}
                {volcanoData.configuracion.label}
              </AlertTitle>
              <AlertDescription className="text-red-200">
                {volcanoData.configuracion.descripcion_corta}
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mb-6">
              <p className="text-white text-lg font-medium">
                {volcanoData.alerta.descripcion}
              </p>

              <div className="bg-red-900/50 border border-red-500 rounded-xl p-4">
                <p className="text-red-300 font-bold">
                  � Sonido activo: {isPlayingSound ? "SÍ" : "NO"}
                </p>
                <p className="text-red-300">
                  Estado modal: {showCriticalAlert ? "VISIBLE" : "OCULTA"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  console.log("🎵 Reproduciendo sonido manualmente");
                  createAlertSound(
                    volcanoData.alerta.nivel_alerta as "naranja" | "rojo"
                  );
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl"
                size="lg"
              >
                🔊 Reproducir Sonido Ahora
              </Button>

              <Button
                onClick={() => {
                  console.log("✅ Cerrando modal - Entendido");
                  setShowCriticalAlert(false);
                  setAlertDismissed(true);
                  setIsPlayingSound(false);
                }}
                variant="outline"
                className="w-full border-gray-500 text-white hover:bg-gray-800 rounded-xl bg-gray-900/50"
                size="lg"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
