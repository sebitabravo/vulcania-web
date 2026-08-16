#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "../lib/app-config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const demo = APP_CONFIG.demoMode;

if (demo) {
  console.log("OK: realtime omitido en modo demo offline.");
  process.exit(0);
}

if (!url || !anon) {
  console.error("ERROR: configura Supabase o activa NEXT_PUBLIC_DEMO_MODE=true.");
  process.exit(1);
}

const client = createClient(url, anon);
const channel = client
  .channel("vulcania-realtime-healthcheck")
  .on("postgres_changes", { event: "*", schema: "public", table: "alertas_volcan" }, () => undefined);

const timeout = setTimeout(() => {
  void channel.unsubscribe();
  console.error("ERROR: Realtime no confirmó suscripción dentro de 8 segundos.");
  process.exit(1);
}, 8_000);

channel.subscribe((status) => {
  if (status === "SUBSCRIBED") {
    clearTimeout(timeout);
    console.log("OK: Realtime suscrito a alertas_volcan.");
    void channel.unsubscribe();
    process.exit(0);
  }
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    clearTimeout(timeout);
    console.error(`ERROR: Realtime respondió ${status}. Ejecuta scripts/init.sql y revisa la publication.`);
    process.exit(1);
  }
});
