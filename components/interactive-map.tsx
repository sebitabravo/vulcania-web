"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as L from "leaflet";
import { MapPin, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase, type PuntoEncuentro } from "@/lib/supabase";

// Componente que solo se renderiza en el cliente
function InteractiveMapClient() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [puntosEncuentro, setPuntosEncuentro] = useState<PuntoEncuentro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] =
    useState<string>("Pucón");

  // Asegurar que estamos en el cliente
  useEffect(() => {
    setIsClient(true);

    // Cargar CSS de Leaflet dinámicamente con manejo de errores
    if (typeof window !== "undefined") {
      const existingLink = document.querySelector('link[href*="leaflet.css"]');

      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        link.onload = () => {
          console.log("✅ Leaflet CSS cargado correctamente");

          // Agregar CSS adicional para marcadores personalizados
          const customStyle = document.createElement("style");
          customStyle.textContent = `
            .custom-div-icon {
              background: transparent !important;
              border: none !important;
            }

            .leaflet-popup-content-wrapper {
              border-radius: 8px !important;
            }

            .leaflet-popup-content {
              margin: 0 !important;
              line-height: 1.4 !important;
            }

            .leaflet-container {
              background: #1f2937 !important;
            }
          `;
          document.head.appendChild(customStyle);
        };
        link.onerror = () => console.error("❌ Error cargando Leaflet CSS");
        document.head.appendChild(link);
      }
    }
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Verificar que Supabase esté configurado
        if (!supabase) {
          console.error("Supabase no está configurado");
          return;
        }

        // Cargar puntos de encuentro
        const { data: puntos, error: errorPuntos } = await supabase
          .from("puntos_encuentro")
          .select("*");

        if (errorPuntos) {
          console.error("Error cargando puntos:", errorPuntos);
        } else {
          setPuntosEncuentro(puntos || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    if (
      isClient &&
      typeof window !== "undefined" &&
      mapRef.current &&
      !mapInstanceRef.current &&
      !loading
    ) {
      // Importar Leaflet dinámicamente
      import("leaflet").then((L) => {
        console.log("📍 Configurando iconos de Leaflet...");

        // Configurar iconos por defecto con URLs más confiables
        delete (
          L.Icon.Default.prototype as L.Icon.Default & {
            _getIconUrl?: () => string;
          }
        )._getIconUrl;

        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        console.log("✅ Iconos de Leaflet configurados correctamente");

        // Crear el mapa centrado en la ubicación seleccionada
        let centerLat = -39.3167;
        let centerLng = -71.9667;
        let zoomLevel = 11;

        if (ubicacionSeleccionada === "Pucón") {
          centerLat = -39.2833;
          centerLng = -71.95;
          zoomLevel = 12;
        } else if (ubicacionSeleccionada === "Villarrica") {
          centerLat = -39.2833;
          centerLng = -72.2333;
          zoomLevel = 12;
        } else if (ubicacionSeleccionada === "Lican-Ray") {
          centerLat = -39.465;
          centerLng = -72.218;
          zoomLevel = 13;
        }

        // Limpiar mapa existente si existe
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Verificar que el contenedor del mapa existe y está vacío
        if (!mapRef.current) {
          console.error("Map container not found");
          return;
        }

        // Limpiar el contenido del contenedor
        mapRef.current.innerHTML = "";

        const map = L.map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: zoomLevel,
        });

        // Guardar referencia del mapa
        mapInstanceRef.current = map;

        // Añadir capa base
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        // Marcador del volcán
        const volcanoIcon = L.divIcon({
          html: '<div style="background-color: #ef4444; border-radius: 50%; width: 20px; height: 20px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          className: "custom-div-icon",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker([-39.4167, -71.9333], { icon: volcanoIcon })
          .addTo(map)
          .bindPopup(
            "<strong>Volcán Villarrica</strong><br>Estado: Monitoreado<br>Altura: 2.847 msnm"
          );

        // Configurar capas
        const baseMaps = {
          OpenStreetMap: L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution: "© OpenStreetMap contributors",
            }
          ),
          Satélite: L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
              attribution:
                "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            }
          ),
        };

        L.control.layers(baseMaps).addTo(map);
        baseMaps["OpenStreetMap"].addTo(map);

        // Añadir control de escala
        L.control.scale({ imperial: false }).addTo(map);

        mapInstanceRef.current = map;
      });
    }
  }, [isClient, loading, ubicacionSeleccionada]);

  // Actualizar marcadores cuando cambien los puntos de encuentro
  useEffect(() => {
    console.log("🗺️ Verificando marcadores:", {
      mapInstance: !!mapInstanceRef.current,
      puntosLength: puntosEncuentro.length,
      puntos: puntosEncuentro,
    });

    if (mapInstanceRef.current && puntosEncuentro.length > 0) {
      console.log(
        "✅ Creando marcadores para",
        puntosEncuentro.length,
        "puntos"
      );

      import("leaflet").then((L) => {
        // Agregar marcadores de puntos de encuentro con iconos personalizados
        puntosEncuentro.forEach((punto, index) => {
          console.log(`🎯 Creando marcador ${index + 1}:`, {
            nombre: punto.nombre,
            lat: punto.latitud,
            lng: punto.longitud,
            ocupado: punto.ocupado,
            seguridad: punto.seguridad_nivel,
          });

          // Determinar el color según el estado de ocupación y nivel de seguridad
          let color = "#22c55e"; // Verde por defecto
          let borderColor = "white";

          if (punto.ocupado) {
            color = "#ef4444"; // Rojo para puntos llenos
            borderColor = "#fbbf24"; // Borde amarillo para destacar
          } else if (punto.seguridad_nivel <= 2) {
            color = "#f59e0b"; // Amarillo para nivel bajo
          } else if (punto.seguridad_nivel >= 5) {
            color = "#3b82f6"; // Azul para nivel máximo
          }

          const meetingIcon = L.divIcon({
            html: `<div style="background-color: ${color}; border-radius: 50%; width: 15px; height: 15px; border: 2px solid ${borderColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative; z-index: 1000;"></div>`,
            className: "custom-div-icon",
            iconSize: [15, 15],
            iconAnchor: [7, 7],
          });

          try {
            const marker = L.marker([punto.latitud, punto.longitud], {
              icon: meetingIcon,
            }).addTo(mapInstanceRef.current!);

            marker.bindPopup(`
              <div style="color: #1f2937; font-weight: 500; min-width: 220px; text-align: center;">
                <strong style="color: #1f2937; font-size: 16px; display: block; margin-bottom: 6px;">${
                  punto.nombre
                }</strong>
                <span style="color: #6b7280; font-size: 13px; display: block; margin-bottom: 12px;">${
                  punto.direccion
                }</span>

                <div style="background: #f3f4f6; border-radius: 8px; padding: 10px; margin: 10px 0; text-align: left;">
                  <div style="color: #4b5563; font-size: 12px; margin-bottom: 4px;">
                    <span style="font-weight: 600;">👥</span> Capacidad: <strong>${
                      punto.capacidad
                    } personas</strong>
                  </div>
                  <div style="color: #4b5563; font-size: 12px; margin-bottom: 4px;">
                    <span style="font-weight: 600;">📊</span> Estado: <strong style="color: ${
                      punto.ocupado ? "#ef4444" : "#22c55e"
                    };">${punto.ocupado ? "LLENO" : "DISPONIBLE"}</strong>
                  </div>
                  <div style="color: #4b5563; font-size: 12px; margin-bottom: 4px;">
                    <span style="font-weight: 600;">🚶</span> Tiempo a pie: <strong>${
                      punto.tiempo_aprox_pie
                    } min</strong>
                  </div>
                  <div style="color: #4b5563; font-size: 12px;">
                    <span style="font-weight: 600;">🛡️</span> Seguridad: <strong>${
                      punto.seguridad_nivel
                    }/5</strong>
                  </div>
                </div>

                ${
                  punto.ocupado
                    ? `<div style="
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    margin-top: 10px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: not-allowed;
                    opacity: 0.8;
                  ">
                    🚫 Punto Lleno
                  </div>`
                    : `<div style="
                    display: flex;
                    gap: 8px;
                    margin-top: 10px;
                    width: 100%;
                  ">
                    <button
                      onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${
                        punto.latitud
                      },${
                        punto.longitud
                      }&destination_place_id=${encodeURIComponent(
                        punto.nombre
                      )}&travelmode=driving', '_blank')"
                      style="
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        padding: 12px 16px;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 700;
                        cursor: pointer;
                        box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
                        transition: all 0.2s ease;
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                      "
                      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(16, 185, 129, 0.4)';"
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(16, 185, 129, 0.3)';"
                    >
                      🚗 Navegar
                    </button>
                    <button
                      onclick="window.open('https://www.google.com/maps/@${
                        punto.latitud
                      },${
                        punto.longitud
                      },3a,75y,90h,90t/data=!3m7!1e1!3m5!1s!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail!7i16384!8i8192', '_blank')"
                      style="
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        color: white;
                        border: none;
                        padding: 12px 16px;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 700;
                        cursor: pointer;
                        box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
                        transition: all 0.2s ease;
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                      "
                      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(59, 130, 246, 0.4)';"
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(59, 130, 246, 0.3)';"
                    >
                      📱 Ver RA
                    </button>
                  </div>`
                }
              </div>
            `);

            console.log(`✅ Marcador ${index + 1} creado:`, punto.nombre);
          } catch (markerError) {
            console.error(
              `❌ Error creando marcador ${index + 1}:`,
              markerError,
              punto
            );
          }
        });

        console.log(
          "✅ Marcadores creados exitosamente:",
          puntosEncuentro.length,
          "puntos agregados al mapa"
        );
      });
    } else {
      console.log("⚠️ No se crearon marcadores:", {
        mapExists: !!mapInstanceRef.current,
        pointsCount: puntosEncuentro.length,
        reason: !mapInstanceRef.current
          ? "Mapa no inicializado"
          : "Sin puntos de encuentro",
      });
    }
  }, [puntosEncuentro]);

  // Limpiar el mapa cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const cambiarUbicacion = (ubicacion: string) => {
    setUbicacionSeleccionada(ubicacion);

    if (mapInstanceRef.current) {
      let centerLat = -39.3167;
      let centerLng = -71.9667;
      let zoomLevel = 11;

      if (ubicacion === "Pucón") {
        centerLat = -39.2833;
        centerLng = -71.95;
        zoomLevel = 12;
      } else if (ubicacion === "Villarrica") {
        centerLat = -39.2833;
        centerLng = -72.2333;
        zoomLevel = 12;
      } else if (ubicacion === "Lican-Ray") {
        centerLat = -39.465;
        centerLng = -72.218;
        zoomLevel = 13;
      }

      mapInstanceRef.current.setView([centerLat, centerLng], zoomLevel);
    }
  };

  if (!isClient || loading) {
    return (
      <div className="w-full h-96 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-red-500" />
          Mapa de Emergencia
        </h3>
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className="border-green-800 text-green-400 bg-green-900/20"
          >
            🚗 GPS
          </Badge>
          <Badge
            variant="outline"
            className="border-blue-800 text-blue-400 bg-blue-900/20"
          >
            📱 Street View
          </Badge>
          <Badge
            variant="outline"
            className="border-purple-800 text-purple-400 bg-purple-900/20"
          >
            {puntosEncuentro.length} Puntos
          </Badge>
        </div>
      </div>

      {/* Selector de ubicación */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => cambiarUbicacion("Pucón")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            ubicacionSeleccionada === "Pucón"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Pucón
        </button>
        <button
          onClick={() => cambiarUbicacion("Villarrica")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            ubicacionSeleccionada === "Villarrica"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Villarrica
        </button>
        <button
          onClick={() => cambiarUbicacion("Lican-Ray")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            ubicacionSeleccionada === "Lican-Ray"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Lican-Ray
        </button>
      </div>

      <div
        ref={mapRef}
        className="w-full h-96 rounded-2xl border border-gray-800"
        style={{ minHeight: "400px" }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <h4 className="text-white font-medium mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-green-500" />
              Puntos de Encuentro
            </h4>
            <p className="text-gray-400 text-xs">
              Haz clic en cualquier punto verde/azul del mapa para ver detalles,
              navegar con GPS y explorar en Realidad Aumentada.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <h4 className="text-white font-medium mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-blue-500" />
              Navegación Avanzada
            </h4>
            <p className="text-gray-400 text-xs">
              Cada punto incluye navegación GPS directa y vista Street View para
              conocer el lugar antes de llegar.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Exportar con dynamic import para evitar errores de hidratación
const InteractiveMap = dynamic(() => Promise.resolve(InteractiveMapClient), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-400">Cargando mapa...</p>
      </div>
    </div>
  ),
});

export default InteractiveMap;
