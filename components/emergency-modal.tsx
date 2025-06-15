"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, AlertCircle, X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

// Función para crear sonidos de alerta usando Web Audio API
const createAlertSound = (type: "naranja" | "rojo") => {
  console.log("🎵 Creando sonido de alerta:", type);
  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    const playBeep = (
      frequency: number,
      duration: number,
      delay = 0,
      volume = 0.5
    ) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime
        );
        oscillator.type = "triangle"; // Sonido más penetrante

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(
          volume,
          audioContext.currentTime + 0.02
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
      // Patrón más intenso para naranja
      playBeep(600, 0.4, 0, 0.6);
      playBeep(800, 0.4, 500, 0.6);
      playBeep(1000, 0.4, 1000, 0.6);
    } else if (type === "rojo") {
      // Sirena más agresiva para rojo
      for (let i = 0; i < 8; i++) {
        playBeep(i % 2 === 0 ? 800 : 1400, 0.3, i * 200, 0.7);
      }
    }
  } catch (error) {
    console.warn("No se pudo reproducir el sonido de alerta:", error);
  }
};

export default function EmergencyModal() {
  const [showModal, setShowModal] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);
  const [soundInterval, setSoundInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Función para detener sonido
  const stopAlertSound = () => {
    if (soundInterval) {
      clearInterval(soundInterval);
      setSoundInterval(null);
    }
    setIsPlayingSound(false);
  };

  // Función para reproducir sonido con repetición
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
        if (showModal && !alertDismissed && soundEnabled) {
          createAlertSound(nivel);
        } else {
          clearInterval(interval);
          setIsPlayingSound(false);
        }
      },
      nivel === "naranja" ? 4000 : 3000
    );

    setSoundInterval(interval);
  };

  // Función para forzar emergencia (para pruebas)
  const forceEmergency = () => {
    console.log("🚨 FORZANDO EMERGENCIA!");
    const fakeAlert = {
      nivel_alerta: "rojo",
      descripcion:
        "🚨 EMERGENCIA DE PRUEBA - Evacuación inmediata obligatoria.",
      informacion_volcan: { nombre: "Villarrica" },
      ultima_actualizacion: new Date().toISOString(),
    };

    // Generar nuevo ID para forzar que se muestre
    const alertId = `${fakeAlert.ultima_actualizacion}-${fakeAlert.nivel_alerta}`;
    setLastAlertId(alertId);
    setCurrentAlert(fakeAlert);
    setAlertDismissed(false);
    setShowModal(true);

    setTimeout(() => {
      playAlertSound("rojo");
    }, 500);
  };

  // Verificar estado de alerta cada 5 segundos
  useEffect(() => {
    const checkAlert = async () => {
      if (!supabase) return;

      try {
        const { data: alerta } = await supabase
          .from("alertas_volcan")
          .select(
            `
            *,
            informacion_volcan (nombre)
          `
          )
          .order("ultima_actualizacion", { ascending: false })
          .limit(1)
          .single();

        if (
          alerta &&
          (alerta.nivel_alerta === "naranja" || alerta.nivel_alerta === "rojo")
        ) {
          // Crear ID único para esta alerta basado en timestamp y nivel
          const alertId = `${alerta.ultima_actualizacion}-${alerta.nivel_alerta}`;

          // Si es una nueva alerta (diferente ID), resetear dismissal
          if (lastAlertId !== alertId) {
            console.log(
              "🆕 Nueva alerta detectada:",
              alerta.nivel_alerta,
              "ID:",
              alertId
            );
            setLastAlertId(alertId);
            setAlertDismissed(false);
            setCurrentAlert(alerta);
            setShowModal(true);

            setTimeout(() => {
              playAlertSound(alerta.nivel_alerta as "naranja" | "rojo");
            }, 1000);
          } else if (!alertDismissed && !showModal) {
            // Si es la misma alerta pero no está mostrada y no fue dismissida
            console.log(
              "🚨 Reactivando alerta existente:",
              alerta.nivel_alerta
            );
            setCurrentAlert(alerta);
            setShowModal(true);

            setTimeout(() => {
              playAlertSound(alerta.nivel_alerta as "naranja" | "rojo");
            }, 1000);
          }
        } else {
          // Si no hay alerta crítica, limpiar estados
          if (showModal) {
            console.log("✅ Alerta ya no es crítica, cerrando modal");
            setShowModal(false);
            stopAlertSound();
          }
        }
      } catch (error) {
        console.error("Error verificando alerta:", error);
      }
    };

    checkAlert();
    const interval = setInterval(checkAlert, 5000);

    return () => {
      clearInterval(interval);
      stopAlertSound();
    };
  }, [alertDismissed, showModal, lastAlertId]); // Agregar dependencias relevantes

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopAlertSound();
    };
  }, []);

  if (!showModal || !currentAlert) return null;

  return (
    <>
      {/* Botones de prueba - solo en desarrollo */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-4 right-4 z-40 space-y-2">
          <Button
            onClick={forceEmergency}
            className="bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse block w-full"
          >
            🚨 Test Emergency
          </Button>
          <Button
            onClick={() => {
              console.log("✅ Simulando vuelta a normal");
              setShowModal(false);
              setAlertDismissed(false); // Permitir que nuevas alertas se muestren
              stopAlertSound();
              setCurrentAlert(null);
              setLastAlertId(null);
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold block w-full"
          >
            ✅ Reset to Normal
          </Button>
        </div>
      )}

      {/* Modal de Emergencia */}
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-red-950 to-black rounded-3xl p-8 max-w-lg w-full shadow-2xl border-2 border-red-500 animate-pulse">
          {/* Barra de estado sonoro */}
          {isPlayingSound && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse rounded-t-3xl"></div>
          )}

          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-4 rounded-full bg-red-600 animate-bounce">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {currentAlert.nivel_alerta === "rojo"
                      ? "🚨 EMERGENCIA VOLCÁNICA"
                      : "⚠️ ALERTA VOLCÁNICA"}
                  </h3>
                  <p className="text-red-400 text-sm">
                    Nivel: {currentAlert.nivel_alerta.toUpperCase()}
                  </p>
                  {isPlayingSound && (
                    <p className="text-red-400 text-sm animate-pulse font-semibold">
                      🔊 ALERTA SONORA ACTIVA
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  console.log("❌ Cerrando modal de emergencia");
                  setShowModal(false);
                  setAlertDismissed(true);
                  stopAlertSound();
                }}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <Alert className="mb-6 bg-red-900/30 border-red-600 border-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <AlertTitle className="text-white text-lg font-bold">
                Volcán {currentAlert.informacion_volcan?.nombre || "Villarrica"}
              </AlertTitle>
              <AlertDescription className="text-red-200">
                {currentAlert.descripcion}
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mb-6">
              <div className="bg-red-900/50 border border-red-500 rounded-xl p-4">
                <p className="text-red-300 font-bold text-center">
                  🚨 EVACUACIÓN INMEDIATA REQUERIDA
                </p>
                <p className="text-red-300 text-center">
                  Sigue las rutas de evacuación establecidas
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Control de sonido */}
              <div className="flex items-center justify-center space-x-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                <button
                  onClick={() => {
                    if (isPlayingSound) {
                      stopAlertSound();
                    } else {
                      playAlertSound(
                        currentAlert.nivel_alerta as "naranja" | "rojo"
                      );
                    }
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isPlayingSound
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                >
                  {isPlayingSound ? (
                    <>
                      <VolumeX className="h-4 w-4" />
                      <span>Silenciar Alerta</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      <span>Reactivar Sonido</span>
                    </>
                  )}
                </button>
              </div>

              <Button
                onClick={() => {
                  console.log("✅ Cerrando modal - Entendido");
                  setShowModal(false);
                  setAlertDismissed(true);
                  stopAlertSound();
                }}
                variant="outline"
                className="w-full border-2 border-gray-500 text-white hover:bg-gray-800 rounded-xl bg-gray-900/50 shadow-lg"
                size="lg"
              >
                He Leído y Entiendo la Alerta
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-6 text-center leading-relaxed">
              Mantente informado a través de canales oficiales.
              <br />
              <span className="text-red-400 font-medium">
                En caso de emergencia llama al 133 (Bomberos) o 131
                (Carabineros)
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
