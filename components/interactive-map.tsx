"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as L from "leaflet";
import { MapPin, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase, type PuntoEncuentro } from "@/lib/supabase";
import { APP_CONFIG } from "@/lib/app-config";
import { DEMO_PUNTOS_ENCUENTRO } from "@/lib/demo-data";
import { logger } from "@/lib/logger";

// Componente que solo se renderiza en el cliente
function InteractiveMapClient() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [puntosEncuentro, setPuntosEncuentro] = useState<PuntoEncuentro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [mapReady, setMapReady] = useState(false); // Nuevo estado para controlar cuando el mapa esté listo
  const [ubicacionSeleccionada, setUbicacionSeleccionada] =
    useState<string>("Pucón");

  // Asegurar que estamos en el cliente
  useEffect(() => {
    setIsClient(true);

    // Cargar CSS de Leaflet de manera más agresiva
    if (typeof window !== "undefined") {
      // Remover cualquier CSS previo de Leaflet
      const existingLinks = document.querySelectorAll('link[href*="leaflet"]');
      existingLinks.forEach((link) => link.remove());

      // Agregar CSS crítico inline primero
      const criticalStyle = document.createElement("style");
      criticalStyle.textContent = `
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          background: #1f2937 !important;
          font-family: inherit !important;
        }

        .leaflet-tile {
          max-width: none !important;
          max-height: none !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .leaflet-tile-container {
          overflow: visible !important;
        }

        .leaflet-tile-pane {
          transform-origin: 0 0 !important;
        }

        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `;
      document.head.insertBefore(criticalStyle, document.head.firstChild);

      // Luego cargar el CSS principal de Leaflet
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      link.onload = () => {
        logger.debug("✅ Leaflet CSS cargado correctamente");

        // Agregar más CSS específico después de cargar
        const additionalStyle = document.createElement("style");
        additionalStyle.textContent = `
          .leaflet-popup-content-wrapper {            border-radius: 8px !important;
          }

          .leaflet-popup-content {
            margin: 0 !important;
            line-height: 1.4 !important;
          }
        `;
        document.head.appendChild(additionalStyle);
      };
      link.onerror = () => logger.error("❌ Error cargando Leaflet CSS");
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      logger.debug("🔄 Iniciando carga de datos...");
      logger.debug("🌍 Environment:", {
        nodeEnv: process.env.NODE_ENV,
        supabaseConfigured: !!supabase,
        windowExists: typeof window !== "undefined",
      });

      try {
        // Verificar que Supabase esté configurado
        if (!supabase) {
          if (APP_CONFIG.demoMode) {
            setPuntosEncuentro(DEMO_PUNTOS_ENCUENTRO);
            return;
          }

          logger.error("❌ Supabase no está configurado");
          logger.debug("🔍 Variables de entorno disponibles:", {
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            supabaseUrl:
              process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
          });
          return;
        }

        logger.debug("✅ Supabase configurado correctamente");

        // Verificar conexión a Supabase primero
        logger.debug("🔍 Verificando conexión a Supabase...");
        const { error: testError } = await supabase
          .from("puntos_encuentro")
          .select("count")
          .limit(1);

        if (testError) {
          logger.error("❌ Error de conexión a Supabase:", testError);
          logger.debug("🔍 Detalles del error:", {
            message: testError.message,
            details: testError.details,
            hint: testError.hint,
            code: testError.code,
          });
          return;
        }

        logger.debug("✅ Conexión a Supabase exitosa");

        // Cargar puntos de encuentro
        logger.debug("📍 Cargando puntos de encuentro...");
        const { data: puntos, error: errorPuntos } = await supabase
          .from("puntos_encuentro")
          .select("*");

        logger.debug("🔍 Resultado de la consulta:", {
          error: errorPuntos,
          dataLength: puntos?.length,
          data: puntos,
        });

        if (errorPuntos) {
          logger.error("❌ Error cargando puntos:", errorPuntos);
          logger.debug("🔍 Detalles del error de puntos:", {
            message: errorPuntos.message,
            details: errorPuntos.details,
            hint: errorPuntos.hint,
            code: errorPuntos.code,
          });
        } else {
          logger.debug(
            `✅ Puntos cargados exitosamente: ${puntos?.length || 0} puntos`
          );
          if (puntos && puntos.length > 0) {
            logger.debug(
              "📍 Puntos encontrados:",
              puntos.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                lat: p.latitud,
                lng: p.longitud,
              }))
            );
          }
          setPuntosEncuentro(puntos || []);
        }
      } catch (error) {
        logger.error("❌ Error general en cargarDatos:", error);
        logger.debug("🔍 Stack trace:", error);
      } finally {
        logger.debug("🏁 Finalizando carga de datos, loading = false");
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
        logger.debug("📍 Configurando iconos de Leaflet...");

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

        logger.debug("✅ Iconos de Leaflet configurados correctamente");

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
          logger.error("Map container not found");
          return;
        }

        // Limpiar el contenido del contenedor
        mapRef.current.innerHTML = "";

        const map = L.map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: zoomLevel,
          preferCanvas: false,
          zoomControl: true,
        });

        // Invalidar el tamaño del mapa múltiples veces para asegurar renderizado correcto
        setTimeout(() => {
          map.invalidateSize(true);
          logger.debug("🗺️ Primera invalidación de tamaño");
        }, 50);

        setTimeout(() => {
          map.invalidateSize(true);
          logger.debug("🗺️ Segunda invalidación de tamaño");
        }, 200);

        setTimeout(() => {
          map.invalidateSize(true);
          logger.debug("🗺️ Tercera invalidación de tamaño");
        }, 500);

        // Guardar referencia del mapa
        mapInstanceRef.current = map;

        // Configurar capas base con opciones optimizadas
        const baseMaps = {
          OpenStreetMap: L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution: "© OpenStreetMap contributors",
              maxZoom: 19,
              tileSize: 256,
              zoomOffset: 0,
              updateWhenIdle: false,
              updateWhenZooming: false,
              keepBuffer: 2,
            }
          ),
          Satélite: L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
              attribution: "Tiles &copy; Esri",
              maxZoom: 18,
              tileSize: 256,
              zoomOffset: 0,
              updateWhenIdle: false,
              updateWhenZooming: false,
              keepBuffer: 2,
            }
          ),
        };

        // Agregar capa base por defecto con evento de carga
        const defaultLayer = baseMaps["OpenStreetMap"];
        defaultLayer.on("load", () => {
          logger.debug("✅ Tiles de mapa cargados");
          map.invalidateSize(true);
        });
        defaultLayer.addTo(map);

        // Agregar control de capas
        L.control.layers(baseMaps).addTo(map);

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

        // Añadir control de escala
        L.control.scale({ imperial: false }).addTo(map);

        // Marcar el mapa como listo y guardar referencia
        mapInstanceRef.current = map;

        // Marcar que el mapa está completamente listo después de un breve delay
        setTimeout(() => {
          logger.debug(
            "🎉 Mapa completamente inicializado y listo para marcadores"
          );
          setMapReady(true);
        }, 100);
      });
    }
  }, [isClient, loading, ubicacionSeleccionada]);

  // Actualizar marcadores cuando cambien los puntos de encuentro Y el mapa esté listo
  useEffect(() => {
    logger.debug("🗺️ useEffect de marcadores activado");
    logger.debug("🗺️ Estado actual:", {
      mapInstance: !!mapInstanceRef.current,
      mapReady: mapReady,
      mapContainer: mapInstanceRef.current?.getContainer() ? "sí" : "no",
      puntosLength: puntosEncuentro.length,
      isClient,
      loading,
    });

    if (puntosEncuentro.length > 0) {
      logger.debug(
        "📍 Puntos disponibles para marcadores:",
        puntosEncuentro.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          lat: p.latitud,
          lng: p.longitud,
          ocupado: p.ocupado,
        }))
      );
    }

    // Solo crear marcadores si el mapa está listo Y tenemos puntos
    if (mapReady && mapInstanceRef.current && puntosEncuentro.length > 0) {
      logger.debug("✅ Todas las condiciones cumplidas - creando marcadores");
      logger.debug(
        `📍 Iniciando creación de ${puntosEncuentro.length} marcadores`
      );

      import("leaflet")
        .then((L) => {
          logger.debug("📦 Leaflet importado exitosamente para marcadores");

          // Agregar marcadores de puntos de encuentro con iconos personalizados
          puntosEncuentro.forEach((punto, index) => {
            logger.debug(
              `🎯 Procesando marcador ${index + 1}/${puntosEncuentro.length}:`,
              {
                nombre: punto.nombre,
                lat: punto.latitud,
                lng: punto.longitud,
                ocupado: punto.ocupado,
                seguridad: punto.seguridad_nivel,
              }
            );

            // Validar coordenadas
            if (!punto.latitud || !punto.longitud) {
              logger.error(`❌ Coordenadas inválidas para ${punto.nombre}:`, {
                lat: punto.latitud,
                lng: punto.longitud,
              });
              return;
            }

            if (
              Math.abs(punto.latitud) > 90 ||
              Math.abs(punto.longitud) > 180
            ) {
              logger.error(
                `❌ Coordenadas fuera de rango para ${punto.nombre}:`,
                {
                  lat: punto.latitud,
                  lng: punto.longitud,
                }
              );
              return;
            }

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

            logger.debug(`🎨 Estilo del marcador ${index + 1}:`, {
              color,
              borderColor,
            });

            const meetingIcon = L.divIcon({
              html: `<div style="background-color: ${color}; border-radius: 50%; width: 15px; height: 15px; border: 2px solid ${borderColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative; z-index: 1000;"></div>`,
              className: "custom-div-icon",
              iconSize: [15, 15],
              iconAnchor: [7, 7],
            });

            try {
              logger.debug(
                `📌 Creando marcador L.marker para ${punto.nombre}...`
              );
              const marker = L.marker([punto.latitud, punto.longitud], {
                icon: meetingIcon,
              });

              logger.debug(
                `🗺️ Añadiendo marcador al mapa para ${punto.nombre}...`
              );
              marker.addTo(mapInstanceRef.current!);

              logger.debug(`💬 Configurando popup para ${punto.nombre}...`);
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
                      � Navegar
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

                <div style="margin-top: 8px; padding: 6px; background: #dbeafe; border-radius: 6px; font-size: 11px; color: #1e40af;">
                  📍 Coordenadas: ${punto.latitud.toFixed(
                    4
                  )}, ${punto.longitud.toFixed(4)}
                </div>
              </div>
            `);

              logger.debug(
                `✅ Marcador ${index + 1} creado exitosamente para ${
                  punto.nombre
                }`
              );
            } catch (markerError) {
              logger.error(
                `❌ Error creando marcador ${index + 1} para ${punto.nombre}:`,
                markerError
              );
              logger.debug("🔍 Detalles del error de marcador:", {
                errorMessage:
                  markerError instanceof Error
                    ? markerError.message
                    : markerError,
                punto: punto,
                mapExists: !!mapInstanceRef.current,
              });
            }
          });

          logger.debug(
            `🎉 Proceso de creación de marcadores completado - ${puntosEncuentro.length} puntos procesados`
          );

          // Invalidar el tamaño del mapa después de añadir marcadores
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize(true);
              logger.debug(
                "🗺️ Tamaño del mapa invalidado después de añadir marcadores"
              );
            }
          }, 100);
        })
        .catch((leafletError) => {
          logger.error(
            "❌ Error importando Leaflet para marcadores:",
            leafletError
          );
        });
    } else {
      logger.debug("⏳ Marcadores no creados - esperando condiciones:", {
        mapExists: !!mapInstanceRef.current,
        mapReady: mapReady,
        puntosCount: puntosEncuentro.length,
        isClient: isClient,
        loading: loading,
        waitingFor: !mapReady
          ? "mapa listo"
          : !mapInstanceRef.current
          ? "instancia de mapa"
          : "puntos de encuentro",
      });
    }
  }, [puntosEncuentro, isClient, loading, mapReady]);

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
    logger.debug(`🗺️ Cambiando ubicación a: ${ubicacion}`);
    setUbicacionSeleccionada(ubicacion);

    // Resetear el estado de mapa listo para forzar re-creación de marcadores
    setMapReady(false);

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

      // Marcar el mapa como listo nuevamente después del cambio de vista
      setTimeout(() => {
        logger.debug(
          `🎯 Mapa reposicionado a ${ubicacion} y listo para marcadores`
        );
        setMapReady(true);
      }, 200);
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
        className="w-full h-96 rounded-2xl border border-gray-800 overflow-hidden"
        style={{
          minHeight: "400px",
          height: "400px",
          position: "relative",
          zIndex: 1,
        }}
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
