#!/usr/bin/env tsx

import { execFileSync } from "node:child_process";
import { resolveDemoMode } from "../lib/app-config";

const demoMode = resolveDemoMode();

console.log("Preparando despliegue a Vercel…");
console.log(`Modo: ${demoMode ? "demo offline" : "Supabase completo"}`);

try {
  execFileSync("pnpm", ["run", "validate-env"], { stdio: "inherit" });
  for (const script of ["lint", "typecheck", "test:run", "test:coverage", "build"]) {
    execFileSync("pnpm", ["run", script], { stdio: "inherit" });
  }
} catch {
  console.error("ERROR: los gates locales fallaron; no se despliega.");
  process.exit(1);
}

if (!process.argv.includes("--production")) {
  console.log("OK: gates locales aprobados; no se ejecutó un despliegue de producción.");
  console.log("Para una entrega autorizada: pnpm run deploy -- --production");
  process.exit(0);
}

try {
  execFileSync("pnpm", ["exec", "vercel", "env", "ls"], { stdio: "inherit" });
} catch {
  console.error("ERROR: la CLI de Vercel no está disponible o el proyecto no está vinculado.");
  console.error("Instala/linkea Vercel en el entorno de entrega y vuelve a intentar.");
  process.exit(1);
}

console.log("Desplegando con Vercel…");
try {
  execFileSync("pnpm", ["exec", "vercel", "--prod"], { stdio: "inherit" });
  console.log("OK: Vercel reportó el despliegue.");
} catch {
  console.error("ERROR: Vercel rechazó el despliegue.");
  process.exit(1);
}
