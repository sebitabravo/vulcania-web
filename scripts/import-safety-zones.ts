#!/usr/bin/env tsx

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

type Traceability = "oficial" | "por_confirmar" | "comunitaria";

interface ImportFile {
  points?: Array<Record<string, unknown>>;
  zones?: Array<Record<string, unknown>>;
}

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function traceability(value: string): Traceability {
  if (value === "oficial" || value === "por_confirmar" || value === "comunitaria") return value;
  throw new Error("--trazabilidad debe ser oficial, por_confirmar o comunitaria");
}

function numberValue(value: unknown, field: string): number {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${field} debe ser numérico`);
  return result;
}

async function main() {
  const file = argument("--file");
  const sourceUrl = argument("--source-url");
  const document = argument("--documento");
  const sourceDate = argument("--fecha");
  const sourceTraceability = traceability(argument("--trazabilidad"));
  if (!isHttpUrl(sourceUrl)) throw new Error("--source-url debe ser http(s)");
  if (Number.isNaN(new Date(sourceDate).getTime())) throw new Error("--fecha debe ser ISO-8601");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY; no se usa la clave anon para importar.");

  const payload = JSON.parse(await readFile(file, "utf8")) as ImportFile;
  const client = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const provenance = `${sourceUrl} · ${document}`;

  const points = (payload.points || []).map((point) => ({
    nombre: String(point.nombre || "").trim(),
    direccion: String(point.direccion || "").trim(),
    latitud: numberValue(point.latitud, "latitud"),
    longitud: numberValue(point.longitud, "longitud"),
    capacidad: numberValue(point.capacidad, "capacidad"),
    seguridad_nivel: numberValue(point.seguridad_nivel, "seguridad_nivel"),
    tiempo_aprox_pie: numberValue(point.tiempo_aprox_pie, "tiempo_aprox_pie"),
    ocupado: false,
    fuente: "SENAPRED · Visor Chile Preparado",
    fuente_url: sourceUrl,
    documento: provenance,
    fecha_fuente: sourceDate,
    trazabilidad: sourceTraceability,
  }));
  if (points.some((point) => !point.nombre || !point.direccion)) throw new Error("Cada punto requiere nombre y dirección");

  const zones = (payload.zones || []).map((zone) => ({
    nivel_alerta: String(zone.nivel_alerta || ""),
    radio_km: numberValue(zone.radio_km, "radio_km"),
    descripcion: String(zone.descripcion || "").trim(),
    fuente: "SENAPRED · Visor Chile Preparado",
    fuente_url: sourceUrl,
    documento: provenance,
    fecha_fuente: sourceDate,
    trazabilidad: sourceTraceability,
  }));
  if (zones.some((zone) => !["verde", "amarillo", "naranja", "rojo"].includes(zone.nivel_alerta) || !zone.descripcion)) {
    throw new Error("Cada zona requiere nivel_alerta válido y descripción");
  }
  if (points.length === 0 && zones.length === 0) throw new Error("El archivo no contiene points ni zones");

  if (points.length > 0) {
    const { error } = await client.from("puntos_encuentro").upsert(points, { onConflict: "nombre" });
    if (error) throw new Error(`Puntos: ${error.message}`);
  }
  if (zones.length > 0) {
    const { error } = await client.from("zonas_exclusion").upsert(zones, { onConflict: "nivel_alerta" });
    if (error) throw new Error(`Zonas: ${error.message}`);
  }

  console.log(`OK: importados ${points.length} puntos y ${zones.length} zonas con trazabilidad ${sourceTraceability}.`);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
