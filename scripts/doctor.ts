#!/usr/bin/env tsx

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "../lib/app-config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tables = [
  "usuarios",
  "perfiles_publicos",
  "informacion_volcan",
  "parametros_volcan",
  "configuraciones_nivel",
  "alertas_volcan",
  "recomendaciones_nivel",
  "zonas_exclusion",
  "acciones_requeridas",
  "puntos_encuentro",
  "avisos_comunidad",
  "mensajes_chat",
  "logs_sistema",
];
const protectedTables = new Set([
  "usuarios",
  "perfiles_publicos",
  "avisos_comunidad",
  "mensajes_chat",
  "logs_sistema",
]);
const realtimeTables = [
  "alertas_volcan",
  "puntos_encuentro",
  "avisos_comunidad",
  "mensajes_chat",
] as const;

function fail(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function classifyError(message: string): string {
  if (/relation .* does not exist|schema cache/i.test(message)) return "tabla ausente";
  if (/permission denied|row-level security|policy/i.test(message)) return "RLS activa (sin sesión anon)";
  if (/fetch failed|network|timeout|ENOTFOUND|ECONNREFUSED|503|504/i.test(message)) return "error de red";
  return message;
}

function isPublicationHealth(data: unknown): data is Record<(typeof realtimeTables)[number], boolean> {
  if (!data || typeof data !== "object") return false;
  return realtimeTables.every((table) => typeof (data as Record<string, unknown>)[table] === "boolean");
}

async function verifyRealtimePublications(client: SupabaseClient) {
  const { data, error } = await client.rpc("verificar_publicaciones_realtime");
  if (error) {
    fail(`Realtime no verificable: ${classifyError(error.message)}. Reejecuta scripts/init.sql.`);
  }
  if (!isPublicationHealth(data)) {
    fail("Realtime no verificable: el health check no devolvió el contrato esperado. Reejecuta scripts/init.sql.");
  }
  const missing = realtimeTables.filter((table) => !data[table]);
  if (missing.length > 0) {
    fail(`Realtime incompleto: faltan ${missing.join(", ")}. Reejecuta scripts/init.sql y vuelve a correr pnpm doctor.`);
  }
  console.log(`OK: Realtime publication (${realtimeTables.join(", ")})`);
}

async function main() {
  console.log("Vulcania Doctor — diagnóstico seguro");

  if (!url || !anon) {
    if (APP_CONFIG.demoMode) {
      console.log("OK: modo demo offline; Supabase no es requerido.");
      return;
    }
    fail("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const anonClient = createClient(url, anon);
  const adminClient = service ? createClient(url, service) : null;
  const { error: pingError } = await anonClient.from("informacion_volcan").select("id").limit(1);
  if (pingError && !/permission denied|row-level security|policy/i.test(pingError.message)) {
    fail(`Conexión inicial fallida: ${classifyError(pingError.message)}`);
  }
  console.log("OK: endpoint de Supabase accesible.");

  await verifyRealtimePublications(adminClient || anonClient);

  for (const table of tables) {
    const client = adminClient || anonClient;
    const { error } = await client.from(table).select("*", { head: true, count: "exact" }).limit(1);
    if (!error) {
      console.log(`OK: ${table}`);
      continue;
    }
    if (!adminClient && protectedTables.has(table) && /permission denied|row-level security|policy/i.test(error.message)) {
      console.log(`OK: ${table} existe y está protegido por RLS.`);
      continue;
    }
    fail(`${table}: ${classifyError(error.message)}`);
  }

  if (adminClient) console.log("OK: service role disponible para diagnóstico profundo (no se imprime la clave).");
  else console.log("INFO: sin service role; tablas protegidas se verificaron por su respuesta RLS.");
  console.log("OK: diagnóstico finalizado.");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
