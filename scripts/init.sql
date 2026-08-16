-- Vulcania — instalación segura para Supabase
--
-- Ejecutar en un proyecto Supabase nuevo desde SQL Editor. El modo completo
-- depende de Supabase Auth: nunca uses esta base como sustituto de OTP.
-- La demo offline no necesita ejecutar este archivo.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Modelo de datos
-- ---------------------------------------------------------------------------

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  telefono text unique,
  rol text not null default 'user' check (rol in ('user', 'operator', 'admin')),
  fecha_creacion timestamptz not null default now()
);

create table if not exists public.informacion_volcan (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text not null unique,
  altura_msnm integer,
  latitud numeric(10, 8) not null check (latitud between -90 and 90),
  longitud numeric(11, 8) not null check (longitud between -180 and 180),
  descripcion text,
  activo boolean not null default true
);

create table if not exists public.parametros_volcan (
  id uuid primary key default gen_random_uuid(),
  sismos_24h integer not null check (sismos_24h >= 0),
  temperatura_crater text not null,
  emision_so2 text not null,
  deformacion text not null,
  fuente text not null default 'Fuente no declarada',
  es_simulacion boolean not null default false,
  fecha_actualizacion timestamptz not null default now()
);

create table if not exists public.configuraciones_nivel (
  id uuid primary key default gen_random_uuid(),
  nivel text not null unique check (nivel in ('verde', 'amarillo', 'naranja', 'rojo')),
  color text not null,
  text_color text not null,
  bg_gradient text not null,
  icon_name text not null,
  label text not null,
  descripcion_corta text not null,
  urgencia text not null,
  pulse_color text not null
);

create table if not exists public.alertas_volcan (
  id uuid primary key default gen_random_uuid(),
  nivel_alerta text not null check (nivel_alerta in ('verde', 'amarillo', 'naranja', 'rojo')),
  descripcion text not null,
  fuente text not null default 'Fuente no declarada',
  referencia text,
  es_simulacion boolean not null default false,
  ultima_actualizacion timestamptz not null default now(),
  parametros_id uuid references public.parametros_volcan(id),
  volcan_id uuid references public.informacion_volcan(id)
);

create table if not exists public.recomendaciones_nivel (
  id uuid primary key default gen_random_uuid(),
  nivel text not null references public.configuraciones_nivel(nivel),
  recomendacion text not null,
  orden integer not null check (orden > 0),
  unique (nivel, orden)
);

create table if not exists public.zonas_exclusion (
  id uuid primary key default gen_random_uuid(),
  nivel_alerta text not null unique references public.configuraciones_nivel(nivel),
  radio_km integer not null check (radio_km >= 0),
  descripcion text not null
);

create table if not exists public.acciones_requeridas (
  id uuid primary key default gen_random_uuid(),
  nivel_alerta text not null unique references public.configuraciones_nivel(nivel),
  evacuar_zona_riesgo boolean not null default false,
  activar_red_comunitaria boolean not null default false,
  revisar_rutas_evacuacion boolean not null default false,
  preparar_kit_emergencia boolean not null default false
);

create table if not exists public.puntos_encuentro (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  direccion text not null,
  latitud numeric(10, 8) not null check (latitud between -90 and 90),
  longitud numeric(11, 8) not null check (longitud between -180 and 180),
  capacidad integer not null check (capacidad >= 0),
  seguridad_nivel integer not null check (seguridad_nivel between 1 and 5),
  tiempo_aprox_pie integer not null check (tiempo_aprox_pie >= 0),
  ocupado boolean not null default false
);

create table if not exists public.avisos_comunidad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  autor_nombre text not null default 'Vecino',
  mensaje text not null check (char_length(mensaje) between 1 and 6000000),
  fecha_creacion timestamptz not null default now(),
  estado text not null default 'activo' check (estado in ('activo', 'inactivo', 'eliminado'))
);

create table if not exists public.mensajes_chat (
  id uuid primary key default gen_random_uuid(),
  emisor_id uuid not null references public.usuarios(id) on delete cascade,
  receptor_id uuid not null references public.usuarios(id) on delete cascade,
  mensaje text not null check (char_length(mensaje) between 1 and 6000000),
  fecha_envio timestamptz not null default now(),
  leido boolean not null default false,
  fecha_lectura timestamptz,
  check (emisor_id <> receptor_id)
);

create table if not exists public.logs_sistema (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  tabla text not null,
  accion text not null,
  registro_id text not null,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  fecha_cambio timestamptz not null default now()
);

create index if not exists idx_alertas_volcan_fecha on public.alertas_volcan (ultima_actualizacion desc);
create index if not exists idx_alertas_volcan_parametros on public.alertas_volcan (parametros_id);
create index if not exists idx_alertas_volcan_volcan on public.alertas_volcan (volcan_id);
create index if not exists idx_avisos_comunidad_fecha on public.avisos_comunidad (fecha_creacion desc);
create index if not exists idx_mensajes_chat_fecha on public.mensajes_chat (fecha_envio desc);
create index if not exists idx_mensajes_chat_usuarios on public.mensajes_chat (emisor_id, receptor_id, fecha_envio desc);
create index if not exists idx_mensajes_no_leidos on public.mensajes_chat (receptor_id, emisor_id, leido) where leido = false;
create index if not exists idx_puntos_encuentro_ubicacion on public.puntos_encuentro (latitud, longitud);

-- La vista expone solo nombres/roles, nunca teléfonos.
create or replace view public.perfiles_publicos as
select id, nombre, rol, fecha_creacion
from public.usuarios;

-- ---------------------------------------------------------------------------
-- 2. Auth, roles y auditoría
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, telefono)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Usuario Vulcania'),
    coalesce(new.phone, 'auth-' || left(new.id::text, 12))
  )
  on conflict (id) do update
    set telefono = excluded.telefono;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and rol in ('operator', 'admin')
  );
$$;

create or replace function public.set_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select nombre into new.autor_nombre
  from public.usuarios
  where id = new.usuario_id;
  return new;
end;
$$;

drop trigger if exists trigger_set_author_name on public.avisos_comunidad;
create trigger trigger_set_author_name
  before insert or update on public.avisos_comunidad
  for each row execute procedure public.set_author_name();

create or replace function public.log_alert_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.logs_sistema (actor_id, tabla, accion, registro_id, datos_anteriores, datos_nuevos)
  values (
    auth.uid(), 'alertas_volcan', tg_op, coalesce(new.id, old.id)::text,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_log_alert_change on public.alertas_volcan;
create trigger trigger_log_alert_change
  after insert or update or delete on public.alertas_volcan
  for each row execute procedure public.log_alert_change();

create or replace function public.log_point_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.ocupado is distinct from new.ocupado then
    insert into public.logs_sistema (actor_id, tabla, accion, registro_id, datos_anteriores, datos_nuevos)
    values (
      auth.uid(), 'puntos_encuentro', 'UPDATE', new.id::text,
      jsonb_build_object('ocupado', old.ocupado),
      jsonb_build_object('ocupado', new.ocupado)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_log_point_change on public.puntos_encuentro;
create trigger trigger_log_point_change
  after update on public.puntos_encuentro
  for each row execute procedure public.log_point_change();

-- ---------------------------------------------------------------------------
-- 3. RPCs atómicos de operación
-- ---------------------------------------------------------------------------

create or replace function public.cambiar_nivel_alerta(nuevo_nivel text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  volcan_id_var uuid;
  parametros_id_var uuid;
  anterior public.alertas_volcan;
  descripcion_var text;
  sismos_var integer;
  temperatura_var text;
  so2_var text;
  deformacion_var text;
begin
  if not public.is_operator() then
    raise exception 'operator_role_required' using errcode = '42501';
  end if;
  if nuevo_nivel not in ('verde', 'amarillo', 'naranja', 'rojo') then
    raise exception 'invalid_alert_level' using errcode = '22023';
  end if;

  -- El estado vigente se actualiza en sitio; el trigger conserva el historial
  -- operativo en logs_sistema sin hacer crecer alertas/parametros sin límite.
  select * into anterior
  from public.alertas_volcan
  order by ultima_actualizacion desc
  limit 1
  for update;
  select id into volcan_id_var from public.informacion_volcan where activo = true order by nombre limit 1;

  case nuevo_nivel
    when 'verde' then
      sismos_var := 12; temperatura_var := '650 °C'; so2_var := '400 ton/día'; deformacion_var := '0,8 cm/mes';
      descripcion_var := 'Actividad volcánica habitual. Monitoreo rutinario activo.';
    when 'amarillo' then
      sismos_var := 45; temperatura_var := '850 °C'; so2_var := '1.200 ton/día'; deformacion_var := '2,3 cm/mes';
      descripcion_var := 'Actividad volcánica inestable. Monitoreo reforzado activo.';
    when 'naranja' then
      sismos_var := 84; temperatura_var := '1.050 °C'; so2_var := '2.400 ton/día'; deformacion_var := '4,8 cm/mes';
      descripcion_var := 'Variación significativa. Sigue instrucciones oficiales y prepara una posible evacuación.';
    when 'rojo' then
      sismos_var := 140; temperatura_var := '1.250 °C'; so2_var := '4.800 ton/día'; deformacion_var := '7,5 cm/mes';
      descripcion_var := 'Erupción mayor inminente o en curso. Sigue las instrucciones oficiales de evacuación.';
  end case;

  if anterior.id is null then
    insert into public.parametros_volcan (sismos_24h, temperatura_crater, emision_so2, deformacion, fuente, es_simulacion)
    values (sismos_var, temperatura_var, so2_var, deformacion_var, 'Simulación de operador Vulcania', true)
    returning id into parametros_id_var;

    insert into public.alertas_volcan (nivel_alerta, descripcion, fuente, referencia, es_simulacion, parametros_id, volcan_id)
    values (nuevo_nivel, descripcion_var, 'Simulación de operador Vulcania', 'OPERADOR-SIM', true, parametros_id_var, volcan_id_var);
  else
    parametros_id_var := anterior.parametros_id;
    if parametros_id_var is null then
      insert into public.parametros_volcan (sismos_24h, temperatura_crater, emision_so2, deformacion, fuente, es_simulacion)
      values (sismos_var, temperatura_var, so2_var, deformacion_var, 'Simulación de operador Vulcania', true)
      returning id into parametros_id_var;
    else
      update public.parametros_volcan
      set sismos_24h = sismos_var,
          temperatura_crater = temperatura_var,
          emision_so2 = so2_var,
          deformacion = deformacion_var,
          fuente = 'Simulación de operador Vulcania',
          es_simulacion = true,
          fecha_actualizacion = now()
      where id = parametros_id_var;
    end if;

    update public.alertas_volcan
    set nivel_alerta = nuevo_nivel,
        descripcion = descripcion_var,
        fuente = 'Simulación de operador Vulcania',
        referencia = 'OPERADOR-SIM',
        es_simulacion = true,
        ultima_actualizacion = now(),
        parametros_id = parametros_id_var,
        volcan_id = volcan_id_var
    where id = anterior.id;
  end if;

  return jsonb_build_object(
    'nivel_alerta', nuevo_nivel,
    'anterior', case when anterior.id is null then null else anterior.nivel_alerta end,
    'parametros_id', parametros_id_var
  );
end;
$$;

create or replace function public.cambiar_estado_punto_encuentro(punto_id uuid, nuevo_estado boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_operator() then
    raise exception 'operator_role_required' using errcode = '42501';
  end if;
  update public.puntos_encuentro set ocupado = nuevo_estado where id = punto_id;
  if not found then raise exception 'meeting_point_not_found'; end if;
end;
$$;

create or replace function public.resetear_puntos_encuentro()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_operator() then
    raise exception 'operator_role_required' using errcode = '42501';
  end if;
  update public.puntos_encuentro set ocupado = false where ocupado = true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS y permisos
-- ---------------------------------------------------------------------------

alter table public.usuarios enable row level security;
alter table public.informacion_volcan enable row level security;
alter table public.parametros_volcan enable row level security;
alter table public.configuraciones_nivel enable row level security;
alter table public.alertas_volcan enable row level security;
alter table public.recomendaciones_nivel enable row level security;
alter table public.zonas_exclusion enable row level security;
alter table public.acciones_requeridas enable row level security;
alter table public.puntos_encuentro enable row level security;
alter table public.avisos_comunidad enable row level security;
alter table public.mensajes_chat enable row level security;
alter table public.logs_sistema enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'usuarios', 'informacion_volcan', 'parametros_volcan', 'configuraciones_nivel',
    'alertas_volcan', 'recomendaciones_nivel', 'zonas_exclusion', 'acciones_requeridas',
    'puntos_encuentro', 'avisos_comunidad', 'mensajes_chat', 'logs_sistema'
  ] loop
    execute format('drop policy if exists "legacy_open_access" on public.%I', table_name);
  end loop;
end;
$$;

drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios for select to authenticated
  using (id = auth.uid() or public.is_operator());

drop policy if exists official_read on public.informacion_volcan;
create policy official_read on public.informacion_volcan for select to anon, authenticated using (activo = true);
drop policy if exists official_read on public.parametros_volcan;
create policy official_read on public.parametros_volcan for select to anon, authenticated using (true);
drop policy if exists official_read on public.configuraciones_nivel;
create policy official_read on public.configuraciones_nivel for select to anon, authenticated using (true);
drop policy if exists official_read on public.alertas_volcan;
create policy official_read on public.alertas_volcan for select to anon, authenticated using (true);
drop policy if exists official_read on public.recomendaciones_nivel;
create policy official_read on public.recomendaciones_nivel for select to anon, authenticated using (true);
drop policy if exists official_read on public.zonas_exclusion;
create policy official_read on public.zonas_exclusion for select to anon, authenticated using (true);
drop policy if exists official_read on public.acciones_requeridas;
create policy official_read on public.acciones_requeridas for select to anon, authenticated using (true);
drop policy if exists points_read on public.puntos_encuentro;
create policy points_read on public.puntos_encuentro for select to anon, authenticated using (true);

drop policy if exists community_read on public.avisos_comunidad;
create policy community_read on public.avisos_comunidad for select to authenticated using (estado = 'activo');
drop policy if exists community_insert on public.avisos_comunidad;
create policy community_insert on public.avisos_comunidad for insert to authenticated
  with check (usuario_id = auth.uid());
drop policy if exists community_update_own on public.avisos_comunidad;
create policy community_update_own on public.avisos_comunidad for update to authenticated
  using (usuario_id = auth.uid() or public.is_operator())
  with check (usuario_id = auth.uid() or public.is_operator());

drop policy if exists chat_read on public.mensajes_chat;
create policy chat_read on public.mensajes_chat for select to authenticated
  using (emisor_id = auth.uid() or receptor_id = auth.uid());
drop policy if exists chat_insert on public.mensajes_chat;
create policy chat_insert on public.mensajes_chat for insert to authenticated
  with check (emisor_id = auth.uid() and receptor_id <> auth.uid());
drop policy if exists chat_mark_read on public.mensajes_chat;
create policy chat_mark_read on public.mensajes_chat for update to authenticated
  using (receptor_id = auth.uid())
  with check (receptor_id = auth.uid());

drop policy if exists logs_operator_read on public.logs_sistema;
create policy logs_operator_read on public.logs_sistema for select to authenticated
  using (public.is_operator());

-- Las mutaciones sensibles pasan solo por las funciones anteriores.
revoke all on public.usuarios from anon, authenticated;
grant select (id, nombre, rol, fecha_creacion) on public.usuarios to authenticated;
grant select (telefono) on public.usuarios to authenticated;
grant select on public.perfiles_publicos to authenticated;
grant select on public.informacion_volcan, public.parametros_volcan, public.configuraciones_nivel,
  public.alertas_volcan, public.recomendaciones_nivel, public.zonas_exclusion,
  public.acciones_requeridas, public.puntos_encuentro to anon, authenticated;
revoke all on public.avisos_comunidad from authenticated;
grant select on public.avisos_comunidad to authenticated;
grant insert (usuario_id, mensaje) on public.avisos_comunidad to authenticated;
grant update (mensaje, estado) on public.avisos_comunidad to authenticated;
revoke all on public.mensajes_chat from authenticated;
grant select on public.mensajes_chat to authenticated;
grant insert (emisor_id, receptor_id, mensaje) on public.mensajes_chat to authenticated;
grant update (leido, fecha_lectura) on public.mensajes_chat to authenticated;
grant execute on function public.cambiar_nivel_alerta(text), public.cambiar_estado_punto_encuentro(uuid, boolean),
  public.resetear_puntos_encuentro() to authenticated;
revoke execute on function public.cambiar_nivel_alerta(text), public.cambiar_estado_punto_encuentro(uuid, boolean),
  public.resetear_puntos_encuentro() from public, anon;
grant execute on function public.is_operator() to authenticated;
revoke execute on function public.is_operator() from public, anon;

-- ---------------------------------------------------------------------------
-- 5. Seed inicial seguro e idempotente
-- ---------------------------------------------------------------------------

insert into public.informacion_volcan (nombre, codigo, altura_msnm, latitud, longitud, descripcion)
values ('Villarrica', 'VIL', 2847, -39.41670000, -71.93330000,
  'Volcán activo de la Región de La Araucanía, Chile.')
on conflict (codigo) do update set nombre = excluded.nombre, altura_msnm = excluded.altura_msnm,
  latitud = excluded.latitud, longitud = excluded.longitud, descripcion = excluded.descripcion;

insert into public.configuraciones_nivel (nivel, color, text_color, bg_gradient, icon_name, label, descripcion_corta, urgencia, pulse_color)
values
  ('verde', 'emerald', 'dark', 'emerald', 'ShieldCheck', 'Alerta Verde', 'Actividad habitual', 'baja', 'none'),
  ('amarillo', 'yellow', 'dark', 'yellow', 'AlertTriangle', 'Alerta Amarilla', 'Actividad inestable', 'media', 'none'),
  ('naranja', 'orange', 'dark', 'orange', 'Flame', 'Alerta Naranja', 'Variación significativa', 'alta', 'one-shot'),
  ('rojo', 'red', 'light', 'red', 'Siren', 'Alerta Roja', 'Erupción mayor inminente o en curso', 'crítica', 'one-shot')
on conflict (nivel) do update set label = excluded.label, descripcion_corta = excluded.descripcion_corta,
  icon_name = excluded.icon_name, urgencia = excluded.urgencia;

insert into public.parametros_volcan (sismos_24h, temperatura_crater, emision_so2, deformacion, fuente, es_simulacion)
select 12, '650 °C', '400 ton/día', '0,8 cm/mes', 'Seed de instalación Vulcania', true
where not exists (select 1 from public.parametros_volcan);

insert into public.alertas_volcan (nivel_alerta, descripcion, fuente, referencia, es_simulacion, parametros_id, volcan_id)
select 'verde', 'Actividad volcánica habitual. Monitoreo rutinario activo.', 'Seed de instalación Vulcania', 'SEED', true,
  (select id from public.parametros_volcan order by fecha_actualizacion limit 1),
  (select id from public.informacion_volcan where codigo = 'VIL')
where not exists (select 1 from public.alertas_volcan);

insert into public.recomendaciones_nivel (nivel, recomendacion, orden)
values
  ('verde', 'Mantente informado por canales oficiales.', 1),
  ('verde', 'Revisa tu plan familiar y rutas de evacuación.', 2),
  ('amarillo', 'Mantente alejado del volcán y sigue a las autoridades.', 1),
  ('amarillo', 'Prepara tu kit y revisa las rutas de evacuación.', 2),
  ('naranja', 'Prepara una posible evacuación y sigue instrucciones oficiales.', 1),
  ('naranja', 'Dirígete al punto de encuentro indicado si se ordena evacuar.', 2),
  ('rojo', 'Sigue las instrucciones oficiales de evacuación.', 1),
  ('rojo', 'No regreses hasta que las autoridades lo autoricen.', 2)
on conflict (nivel, orden) do update set recomendacion = excluded.recomendacion;

insert into public.zonas_exclusion (nivel_alerta, radio_km, descripcion)
values ('verde', 3, 'Zona de exclusión técnica de 3 km'), ('amarillo', 3, 'Zona de exclusión técnica de 3 km'),
  ('naranja', 8, 'Zona de exclusión ampliada de 8 km'), ('rojo', 15, 'Zona de exclusión crítica de 15 km')
on conflict (nivel_alerta) do update set radio_km = excluded.radio_km, descripcion = excluded.descripcion;

insert into public.acciones_requeridas (nivel_alerta, evacuar_zona_riesgo, activar_red_comunitaria, revisar_rutas_evacuacion, preparar_kit_emergencia)
values ('verde', false, false, true, false), ('amarillo', false, false, true, true),
  ('naranja', true, true, true, true), ('rojo', true, true, true, true)
on conflict (nivel_alerta) do update set evacuar_zona_riesgo = excluded.evacuar_zona_riesgo,
  activar_red_comunitaria = excluded.activar_red_comunitaria, revisar_rutas_evacuacion = excluded.revisar_rutas_evacuacion,
  preparar_kit_emergencia = excluded.preparar_kit_emergencia;

insert into public.puntos_encuentro (nombre, direccion, latitud, longitud, capacidad, seguridad_nivel, tiempo_aprox_pie, ocupado)
values
  ('Estadio Pucón', 'Centro de Pucón', -39.27960000, -71.97250000, 500, 4, 20, false),
  ('Escuela Quelhue', 'Sector Quelhue', -39.25750000, -71.91770000, 250, 3, 35, false),
  ('Club de Huasos', 'Piedra Amarilla', -39.35410000, -72.04290000, 300, 4, 45, false),
  ('Mirador Puente Pellaifa', 'Camino a Coñaripe', -39.58891500, -72.01955300, 150, 4, 30, false)
on conflict (nombre) do update set direccion = excluded.direccion, latitud = excluded.latitud,
  longitud = excluded.longitud, capacidad = excluded.capacidad, seguridad_nivel = excluded.seguridad_nivel,
  tiempo_aprox_pie = excluded.tiempo_aprox_pie;

-- ---------------------------------------------------------------------------
-- 6. Realtime: se agrega solo si todavía no está publicada
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'alertas_volcan') then
    alter publication supabase_realtime add table public.alertas_volcan;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'puntos_encuentro') then
    alter publication supabase_realtime add table public.puntos_encuentro;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'avisos_comunidad') then
    alter publication supabase_realtime add table public.avisos_comunidad;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'mensajes_chat') then
    alter publication supabase_realtime add table public.mensajes_chat;
  end if;
end;
$$;

-- Verificación rápida (visible en SQL Editor): 12 tablas con RLS, alerta verde
-- inicial y cuatro tablas publicadas para Realtime.
