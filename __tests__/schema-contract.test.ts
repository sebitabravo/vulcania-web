/**
 * Contratos estáticos de la instalación Supabase.
 *
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "scripts/init.sql"), "utf8");
const doctor = readFileSync(resolve(process.cwd(), "scripts/doctor.ts"), "utf8");

describe("scripts/init.sql", () => {
  it("mantiene RLS, policies y publicación Realtime para toda la superficie", () => {
    expect((schema.match(/create table if not exists public\./g) ?? []).length).toBe(15);
    expect((schema.match(/alter table public\.[\w]+ enable row level security/g) ?? []).length).toBe(15);
    expect((schema.match(/create policy /g) ?? []).length).toBe(21);
    expect((schema.match(/alter publication supabase_realtime add table/g) ?? []).length).toBe(4);
    expect(schema).toContain("create or replace function public.verificar_publicaciones_realtime()");
    expect(schema).toContain("grant execute on function public.verificar_publicaciones_realtime() to anon, authenticated, service_role");
    expect(schema).toContain("pg_catalog.pg_publication_tables");
  });

  it("no fabrica mediciones aleatorias y bloquea RPC sensibles al rol público", () => {
    expect(schema).not.toContain("random()");
    expect(schema).toContain("revoke execute on function public.cambiar_nivel_alerta(text, text, timestamptz)");
    expect(schema).toContain("drop function if exists public.cambiar_nivel_alerta(text)");
    expect(schema).toContain("create table if not exists public.detecciones");
    expect(schema).toContain("documented_consent_required");
    expect(schema).toContain("revoke execute on function public.is_operator() from public, anon");
    expect(schema).toContain("from public, anon");
    expect(schema).toContain("check (emisor_id <> receptor_id)");
  });

  it("hace que doctor falle de forma accionable si falta Realtime", () => {
    expect(doctor).toContain('client.rpc("verificar_publicaciones_realtime")');
    expect(doctor).toContain("Reejecuta scripts/init.sql");
    expect(doctor).toContain("realtimeTables");
  });
});
