"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { ExternalLink, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_CONFIG } from "@/lib/app-config";
import { DEMO_PUNTOS_ENCUENTRO, DEMO_ZONAS_EXCLUSION } from "@/lib/demo-data";
import { useAlert } from "@/contexts/alert-context";
import { getAlertLevelConfig, isAlertLevel } from "@/lib/alert-levels";
import { supabase, type PuntoEncuentro, type ZonaExclusion } from "@/lib/supabase";

const LOCATIONS = {
  Pucón: { center: [-39.2833, -71.95] as [number, number], zoom: 12 },
  Villarrica: { center: [-39.2833, -72.2333] as [number, number], zoom: 11 },
  "Lican-Ray": { center: [-39.465, -72.218] as [number, number], zoom: 12 },
};

function navigationUrl(point: PuntoEncuentro): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitud},${point.longitud}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isValidCoordinate(latitud: number, longitud: number): boolean {
  return Number.isFinite(latitud) && Number.isFinite(longitud) && latitud >= -90 && latitud <= 90 && longitud >= -180 && longitud <= 180;
}

function tooltipText(text: string): HTMLElement {
  const element = document.createElement("span");
  element.textContent = text;
  return element;
}

export default function InteractiveMap() {
  const { alerta } = useAlert();
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [points, setPoints] = useState<PuntoEncuentro[]>(APP_CONFIG.demoMode ? DEMO_PUNTOS_ENCUENTRO : []);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [location, setLocation] = useState<keyof typeof LOCATIONS>("Pucón");
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exclusionZone, setExclusionZone] = useState<ZonaExclusion | null>(null);
  const activeLevel = alerta && isAlertLevel(alerta.nivel_alerta) ? alerta.nivel_alerta : null;

  useEffect(() => {
    let mounted = true;
    const loadPoints = async () => {
      if (APP_CONFIG.demoMode) {
        if (mounted) setLoading(false);
        return;
      }
      if (!supabase) {
        if (mounted) {
          setError("Mapa demo disponible sin Supabase. Configura la base para puntos persistentes.");
          setLoading(false);
        }
        return;
      }
      const { data, error: queryError } = await supabase.from("puntos_encuentro").select("*").order("tiempo_aprox_pie");
      if (!mounted) return;
      if (queryError) setError("No pudimos cargar los puntos de encuentro.");
      else setPoints((data as PuntoEncuentro[]) || []);
      setLoading(false);
    };
    void loadPoints();

    if (APP_CONFIG.demoMode || !supabase) return () => { mounted = false; };
    const channel = supabase.channel("vulcania-meeting-points").on("postgres_changes", { event: "*", schema: "public", table: "puntos_encuentro" }, () => void loadPoints()).subscribe();
    return () => {
      mounted = false;
      void channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadExclusionZone = async () => {
      if (!activeLevel) {
        if (mounted) setExclusionZone(null);
        return;
      }
      if (APP_CONFIG.demoMode) {
        if (mounted) setExclusionZone(DEMO_ZONAS_EXCLUSION.find((zone) => zone.nivel_alerta === activeLevel) ?? null);
        return;
      }
      if (!supabase) {
        if (mounted) setExclusionZone(null);
        return;
      }
      const { data } = await supabase
        .from("zonas_exclusion")
        .select("id, nivel_alerta, radio_km, descripcion")
        .eq("nivel_alerta", activeLevel)
        .maybeSingle();
      if (mounted) setExclusionZone((data as ZonaExclusion | null) ?? null);
    };
    void loadExclusionZone();
    return () => {
      mounted = false;
    };
  }, [activeLevel]);

  useEffect(() => {
    let disposed = false;
    const element = mapElementRef.current;
    if (!element || mapRef.current) return;

    void import("leaflet").then((L) => {
      if (disposed || !mapElementRef.current) return;
      const map = L.map(mapElementRef.current, { center: LOCATIONS.Pucón.center, zoom: LOCATIONS.Pucón.zoom, zoomControl: true, preferCanvas: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);
      const markerLayer = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = markerLayer;
      map.whenReady(() => {
        if (!disposed) setMapReady(true);
      });

      const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
      observer.observe(element);
      (map as Leaflet.Map & { __vulcaniaResizeObserver?: ResizeObserver }).__vulcaniaResizeObserver = observer;
    });

    return () => {
      disposed = true;
      const map = mapRef.current as (Leaflet.Map & { __vulcaniaResizeObserver?: ResizeObserver }) | null;
      map?.__vulcaniaResizeObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // El contenedor del mapa solo existe cuando loading=false; sin esta
    // dependencia el init corre con ref null y el mapa queda muerto.
  }, [loading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView(LOCATIONS[location].center, LOCATIONS[location].zoom, { animate: false });
  }, [location, mapReady]);

  useEffect(() => {
    if (!mapReady || !layerRef.current) return;
    let cancelled = false;
    void import("leaflet").then((L) => {
      const layer = layerRef.current;
      if (cancelled || !layer || !mapRef.current) return;
      layer.clearLayers();

      const volcanoIcon = L.divIcon({
        className: "vulcania-marker vulcania-marker-volcano",
        html: '<span aria-hidden="true"></span>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const zoneConfig = getAlertLevelConfig(activeLevel ?? "verde");
      if (exclusionZone && Number.isFinite(exclusionZone.radio_km) && exclusionZone.radio_km > 0) {
        L.circle([-39.4167, -71.9333], {
          radius: exclusionZone.radio_km * 1_000,
          color: zoneConfig.accentColor,
          fillColor: zoneConfig.accentColor,
          fillOpacity: 0.08,
          weight: 2,
          dashArray: "6 6",
        }).addTo(layer).bindTooltip(tooltipText(`Zona de exclusión referencial: ${exclusionZone.radio_km} km`));
      }
      L.marker([-39.4167, -71.9333], { icon: volcanoIcon }).addTo(layer).bindTooltip(tooltipText("Volcán Villarrica — monitoreo técnico"));

      points.forEach((point) => {
        if (!isValidCoordinate(point.latitud, point.longitud)) return;
        const markerIcon = L.divIcon({
          className: `vulcania-marker ${point.ocupado ? "vulcania-marker-full" : "vulcania-marker-point"}`,
          html: `<span aria-hidden="true"></span>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        const marker = L.marker([point.latitud, point.longitud], { icon: markerIcon, title: point.nombre, alt: point.nombre });
        marker.addTo(layer);
        marker.bindTooltip(tooltipText(point.nombre));
        marker.on("click", () => setSelectedPoint(point.id));
      });
    });
    return () => { cancelled = true; };
  }, [activeLevel, exclusionZone, mapReady, points]);

  useEffect(() => {
    if (!selectedPoint || !mapRef.current) return;
    const point = points.find((item) => item.id === selectedPoint);
    if (point && isValidCoordinate(point.latitud, point.longitud)) {
      mapRef.current.setView([point.latitud, point.longitud], 14, { animate: !prefersReducedMotion() });
    }
  }, [points, selectedPoint]);

  if (loading) {
    return <div className="h-[28rem] animate-shimmer rounded-xl border border-border/70 bg-card/60" aria-label="Cargando mapa" />;
  }

  return (
    <section className="space-y-5" aria-labelledby="map-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Cartografía de apoyo</p>
          <h2 id="map-title" className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">Puntos de encuentro</h2>
          <p className="mt-1 text-sm text-muted-foreground">Selecciona un punto en el mapa o usa la lista accesible debajo.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 border-border/80 bg-card/70 text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" /> {points.length} ubicaciones</Badge>
      </div>

      {APP_CONFIG.demoMode ? <p className="rounded-lg border border-primary/20 bg-primary/[0.06] p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Simulación demo:</strong> los puntos son referenciales y no sustituyen el plan de evacuación local.</p> : null}
      {error ? <p role="status" className="rounded-lg border border-yellow-300/25 bg-yellow-300/[0.06] p-3 text-sm text-yellow-100">{error}</p> : null}
      {exclusionZone ? <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border/70 bg-card/50 p-3 text-sm"><strong>Zona de exclusión referencial</strong><span className="font-mono text-primary">{exclusionZone.radio_km} km</span><span className="text-muted-foreground">{exclusionZone.descripcion}</span></div> : null}

      <div className="flex flex-wrap gap-2" aria-label="Cambiar zona del mapa">
        {(Object.keys(LOCATIONS) as Array<keyof typeof LOCATIONS>).map((item) => <Button key={item} type="button" size="sm" variant={location === item ? "default" : "outline"} onClick={() => setLocation(item)}>{item}</Button>)}
      </div>

      <Card className="overflow-hidden border-border/80 bg-card/60">
        <div ref={mapElementRef} className="h-[26rem] w-full bg-[#101820] sm:h-[32rem]" role="application" aria-label="Mapa interactivo de puntos de encuentro. Usa la lista textual para navegar con teclado." />
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/70 p-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><i className="map-legend-dot map-legend-volcano" aria-hidden="true" /> Volcán monitoreado</span>
          <span className="inline-flex items-center gap-2"><i className="map-legend-zone" aria-hidden="true" /> Zona de exclusión referencial</span>
          <span className="inline-flex items-center gap-2"><i className="map-legend-dot map-legend-point" aria-hidden="true" /> Punto disponible</span>
          <span className="inline-flex items-center gap-2"><i className="map-legend-dot map-legend-full" aria-hidden="true" /> Punto lleno</span>
          <span className="ml-auto inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" /> Datos referenciales · verifica el estado en el encabezado</span>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-semibold">Lista de puntos</h3><span className="text-xs text-muted-foreground">Alternativa al mapa</span></div>
        {points.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center"><MapPin className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 font-display font-semibold">Sin puntos registrados</p><p className="mt-1 text-sm text-muted-foreground">Registra el primero desde el panel de operación.</p></div> : <div className="grid gap-3 md:grid-cols-2">{points.map((point) => <Card key={point.id} className={`border-border/80 bg-card/60 transition-colors ${selectedPoint === point.id ? "border-primary/60 ring-1 ring-primary/30" : ""}`}><CardContent className="p-4"><button type="button" onClick={() => setSelectedPoint(point.id)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{point.nombre}</p><p className="mt-1 text-sm text-muted-foreground">{point.direccion}</p></div><Badge variant="outline" className={point.ocupado ? "border-red-300/40 bg-red-400/10 text-red-200" : "border-emerald-300/40 bg-emerald-400/10 text-emerald-200"}>{point.ocupado ? "Lleno" : "Disponible"}</Badge></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-xs"><span><strong className="block font-mono text-foreground">{point.capacidad}</strong><span className="text-muted-foreground">capacidad</span></span><span><strong className="block font-mono text-foreground">{point.tiempo_aprox_pie} min</strong><span className="text-muted-foreground">a pie</span></span><span><strong className="block font-mono text-foreground">{point.seguridad_nivel}/5</strong><span className="text-muted-foreground">seguridad</span></span></div></button><div className="mt-3 flex gap-2"><Button asChild size="sm" variant="outline" className="min-h-10 flex-1" disabled={point.ocupado}><a href={point.ocupado ? undefined : navigationUrl(point)} target="_blank" rel="noreferrer" aria-disabled={point.ocupado || undefined} tabIndex={point.ocupado ? -1 : undefined}><Navigation aria-hidden="true" /> Navegar</a></Button><a href={`https://www.google.com/maps/search/?api=1&query=${point.latitud},${point.longitud}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver mapa <ExternalLink className="size-3" aria-hidden="true" /></a></div></CardContent></Card>)}</div>}
      </div>
    </section>
  );
}
