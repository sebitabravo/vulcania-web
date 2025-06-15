"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Activity,
  TrendingUp,
  Shield,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase, type AlertaVolcan } from "@/lib/supabase";

const getNivelConfig = (nivel: string) => {
  switch (nivel) {
    case "verde":
      return {
        color: "bg-green-600",
        textColor: "text-white",
        bgGradient: "from-green-900/30 to-green-900/10",
        icon: Shield,
        label: "NORMAL",
      };
    case "amarillo":
      return {
        color: "bg-yellow-600",
        textColor: "text-white",
        bgGradient: "from-yellow-900/30 to-yellow-900/10",
        icon: Activity,
        label: "PRECAUCIÓN",
      };
    case "naranja":
      return {
        color: "bg-orange-600",
        textColor: "text-white",
        bgGradient: "from-orange-900/30 to-orange-900/10",
        icon: TrendingUp,
        label: "ALERTA",
      };
    case "rojo":
      return {
        color: "bg-red-600",
        textColor: "text-white",
        bgGradient: "from-red-900/30 to-red-900/10",
        icon: AlertTriangle,
        label: "EMERGENCIA",
      };
    default:
      return {
        color: "bg-gray-600",
        textColor: "text-white",
        bgGradient: "from-gray-900/30 to-gray-900/10",
        icon: Activity,
        label: "DESCONOCIDO",
      };
  }
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

export default function VolcanoStatusHeader() {
  const [alerta, setAlerta] = useState<AlertaVolcan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarAlerta = async () => {
      if (!supabase) {
        console.error("❌ Supabase no está configurado");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("alertas_volcan")
          .select("*")
          .order("ultima_actualizacion", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error("Error cargando alerta:", error);
          return;
        }

        setAlerta(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarAlerta();

    // Suscribirse a cambios en tiempo real solo si supabase está disponible
    if (!supabase) return;

    const subscription = supabase
      .channel("alertas_volcan_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alertas_volcan" },
        () => {
          cargarAlerta();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 border-b border-gray-800 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-16 bg-gray-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!alerta) return null;

  const config = getNivelConfig(alerta.nivel_alerta);
  const IconComponent = config.icon;

  return (
    <div
      className={`border-b border-gray-800 bg-gradient-to-r ${config.bgGradient}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${config.color}`}>
              <IconComponent className={`h-6 w-6 ${config.textColor}`} />
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h2 className="text-xl font-semibold text-white">
                  Volcán Villarrica
                </h2>
                <Badge
                  className={`${config.color} ${config.textColor} font-medium`}
                >
                  {config.label}
                </Badge>
              </div>
              <p className="text-gray-300 text-sm mb-1">{alerta.descripcion}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>
                  Actualizado{" "}
                  {calcularTiempoTranscurrido(alerta.ultima_actualizacion)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
