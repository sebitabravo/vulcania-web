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
  tipo_volcan text,
  laguna_lava boolean,
  erupciones_registradas integer check (erupciones_registradas is null or erupciones_registradas >= 0),
  ultima_erupcion_vei integer check (ultima_erupcion_vei is null or ultima_erupcion_vei between 0 and 8),
  riesgos_principales text,
  fuente text not null default 'Fuente no declarada',
  fuente_url text check (fuente_url is null or fuente_url ~* '^https?://'),
  ultima_verificacion timestamptz,
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
  fuente_url text check (fuente_url is null or fuente_url ~* '^https?://'),
  fecha_publicacion timestamptz,
  fecha_verificacion timestamptz,
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
  descripcion text not null,
  fuente text not null default 'Por confirmar',
  fuente_url text check (fuente_url is null or fuente_url ~* '^https?://'),
  documento text,
  fecha_fuente timestamptz,
  trazabilidad text not null default 'por_confirmar' check (trazabilidad in ('oficial', 'por_confirmar', 'comunitaria'))
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
  ocupado boolean not null default false,
  fuente text not null default 'Por confirmar',
  fuente_url text check (fuente_url is null or fuente_url ~* '^https?://'),
  documento text,
  fecha_fuente timestamptz,
  trazabilidad text not null default 'por_confirmar' check (trazabilidad in ('oficial', 'por_confirmar', 'comunitaria'))
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

create table if not exists public.detecciones (
  id uuid primary key default gen_random_uuid(),
  fuente_tipo text not null check (fuente_tipo in ('sernageomin', 'gvp')),
  fuente_url text not null check (fuente_url ~* '^https?://'),
  fingerprint text not null unique,
  titulo text not null,
  fecha_documento timestamptz,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'notificado', 'error')),
  detalle text,
  notificado boolean not null default false,
  fecha_detectado timestamptz not null default now(),
  fecha_notificado timestamptz
);

create table if not exists public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('autenticacion', 'nombre_comunidad', 'alertas_sms')),
  aceptado boolean not null,
  version_terminos text not null,
  fecha_decision timestamptz not null default now(),
  fecha_revocacion timestamptz,
  unique (usuario_id, tipo, version_terminos)
);

create table if not exists public.terminos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('terminos', 'privacidad')),
  version text not null,
  titulo text not null,
  ruta text not null,
  fecha_publicacion timestamptz not null default now(),
  activo boolean not null default true,
  unique (tipo, version)
);

-- Compatibilidad con instalaciones que ya ejecutaron una versión anterior.
alter table public.informacion_volcan add column if not exists tipo_volcan text;
alter table public.informacion_volcan add column if not exists laguna_lava boolean;
alter table public.informacion_volcan add column if not exists erupciones_registradas integer;
alter table public.informacion_volcan add column if not exists ultima_erupcion_vei integer;
alter table public.informacion_volcan add column if not exists riesgos_principales text;
alter table public.informacion_volcan add column if not exists fuente text not null default 'Fuente no declarada';
alter table public.informacion_volcan add column if not exists fuente_url text;
alter table public.informacion_volcan add column if not exists ultima_verificacion timestamptz;
alter table public.alertas_volcan add column if not exists fuente_url text;
alter table public.alertas_volcan add column if not exists fecha_publicacion timestamptz;
alter table public.alertas_volcan add column if not exists fecha_verificacion timestamptz;
alter table public.zonas_exclusion add column if not exists fuente text not null default 'Por confirmar';
alter table public.zonas_exclusion add column if not exists fuente_url text;
alter table public.zonas_exclusion add column if not exists documento text;
alter table public.zonas_exclusion add column if not exists fecha_fuente timestamptz;
alter table public.zonas_exclusion add column if not exists trazabilidad text not null default 'por_confirmar';
alter table public.puntos_encuentro add column if not exists fuente text not null default 'Por confirmar';
alter table public.puntos_encuentro add column if not exists fuente_url text;
alter table public.puntos_encuentro add column if not exists documento text;
alter table public.puntos_encuentro add column if not exists fecha_fuente timestamptz;
alter table public.puntos_encuentro add column if not exists trazabilidad text not null default 'por_confirmar';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'zonas_exclusion_trazabilidad_check') then
    alter table public.zonas_exclusion add constraint zonas_exclusion_trazabilidad_check
      check (trazabilidad in ('oficial', 'por_confirmar', 'comunitaria'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'puntos_encuentro_trazabilidad_check') then
    alter table public.puntos_encuentro add constraint puntos_encuentro_trazabilidad_check
      check (trazabilidad in ('oficial', 'por_confirmar', 'comunitaria'));
  end if;
end;
$$;

create index if not exists idx_alertas_volcan_fecha on public.alertas_volcan (ultima_actualizacion desc);
create index if not exists idx_alertas_volcan_parametros on public.alertas_volcan (parametros_id);
create index if not exists idx_alertas_volcan_volcan on public.alertas_volcan (volcan_id);
create index if not exists idx_avisos_comunidad_fecha on public.avisos_comunidad (fecha_creacion desc);
create index if not exists idx_mensajes_chat_fecha on public.mensajes_chat (fecha_envio desc);
create index if not exists idx_mensajes_chat_usuarios on public.mensajes_chat (emisor_id, receptor_id, fecha_envio desc);
create index if not exists idx_mensajes_no_leidos on public.mensajes_chat (receptor_id, emisor_id, leido) where leido = false;
create index if not exists idx_puntos_encuentro_ubicacion on public.puntos_encuentro (latitud, longitud);
create index if not exists idx_detecciones_fecha on public.detecciones (fecha_detectado desc);
create index if not exists idx_detecciones_estado on public.detecciones (estado, fecha_detectado desc);
create index if not exists idx_consentimientos_usuario on public.consentimientos (usuario_id, tipo, fecha_decision desc);

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
declare
  terms_version_var text;
  auth_consent_var boolean;
  adult_var boolean;
begin
  terms_version_var := nullif(new.raw_user_meta_data ->> 'terms_version', '');
  auth_consent_var := coalesce((new.raw_user_meta_data ->> 'consent_auth')::boolean, false);
  adult_var := coalesce((new.raw_user_meta_data ->> 'mayor_edad')::boolean, false);

  if not auth_consent_var or not adult_var or terms_version_var is null then
    raise exception 'documented_consent_required' using errcode = '42501';
  end if;

  insert into public.usuarios (id, nombre, telefono)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Usuario Vulcania'),
    coalesce(new.phone, 'auth-' || left(new.id::text, 12))
  )
  on conflict (id) do update
    set telefono = excluded.telefono;

  insert into public.consentimientos (usuario_id, tipo, aceptado, version_terminos)
  values
    (new.id, 'autenticacion', true, terms_version_var),
    (new.id, 'nombre_comunidad', coalesce((new.raw_user_meta_data ->> 'consent_community_name')::boolean, false), terms_version_var),
    (new.id, 'alertas_sms', coalesce((new.raw_user_meta_data ->> 'consent_alertas_sms')::boolean, false), terms_version_var)
  on conflict (usuario_id, tipo, version_terminos) do update
    set aceptado = excluded.aceptado,
        fecha_decision = now(),
        fecha_revocacion = case when excluded.aceptado then null else now() end;
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
declare
  can_show_name boolean;
begin
  select coalesce(bool_or(c.aceptado), false) into can_show_name
  from public.consentimientos c
  where c.usuario_id = new.usuario_id
    and c.tipo = 'nombre_comunidad'
    and c.fecha_revocacion is null;

  select case when can_show_name then nombre else 'Vecino' end into new.autor_nombre
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

drop function if exists public.cambiar_nivel_alerta(text);
create or replace function public.cambiar_nivel_alerta(
  nuevo_nivel text,
  fuente_url_input text,
  fecha_publicacion_input timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  volcan_id_var uuid;
  anterior public.alertas_volcan;
  descripcion_var text;
begin
  if not public.is_operator() then
    raise exception 'operator_role_required' using errcode = '42501';
  end if;
  if nuevo_nivel not in ('verde', 'amarillo', 'naranja', 'rojo') then
    raise exception 'invalid_alert_level' using errcode = '22023';
  end if;
  if fuente_url_input is null or fuente_url_input !~* '^https?://' then
    raise exception 'official_source_url_required' using errcode = '22023';
  end if;
  if fecha_publicacion_input is null or fecha_publicacion_input > now() then
    raise exception 'invalid_source_publication_date' using errcode = '22023';
  end if;

  -- El estado vigente se actualiza en sitio; el trigger conserva el historial
  -- operativo en logs_sistema con fuente, publicación y verificación.
  select * into anterior
  from public.alertas_volcan
  order by ultima_actualizacion desc
  limit 1
  for update;
  select id into volcan_id_var from public.informacion_volcan where activo = true order by nombre limit 1;

  case nuevo_nivel
    when 'verde' then
      descripcion_var := 'Actividad volcánica dentro del nivel verde informado por la fuente oficial. Contrasta siempre con SERNAGEOMIN y SENAPRED.';
    when 'amarillo' then
      descripcion_var := 'Actividad volcánica dentro del nivel amarillo informado por la fuente oficial. Sigue las instrucciones de las autoridades.';
    when 'naranja' then
      descripcion_var := 'Variación significativa informada por la fuente oficial. Sigue instrucciones oficiales y prepara una posible evacuación.';
    when 'rojo' then
      descripcion_var := 'Erupción mayor inminente o en curso según la fuente oficial. Sigue las instrucciones oficiales de evacuación.';
  end case;

  if anterior.id is null then
    insert into public.alertas_volcan (
      nivel_alerta, descripcion, fuente, referencia, fuente_url,
      fecha_publicacion, fecha_verificacion, es_simulacion, parametros_id, volcan_id
    )
    values (
      nuevo_nivel, descripcion_var, 'Verificación de operador', fuente_url_input, fuente_url_input,
      fecha_publicacion_input, now(), false, null, volcan_id_var
    );
  else
    update public.alertas_volcan
    set nivel_alerta = nuevo_nivel,
        descripcion = descripcion_var,
        fuente = 'Verificación de operador',
        referencia = fuente_url_input,
        fuente_url = fuente_url_input,
        fecha_publicacion = fecha_publicacion_input,
        fecha_verificacion = now(),
        es_simulacion = false,
        ultima_actualizacion = now(),
        parametros_id = null,
        volcan_id = volcan_id_var
    where id = anterior.id;
  end if;

  return jsonb_build_object(
    'nivel_alerta', nuevo_nivel,
    'anterior', case when anterior.id is null then null else anterior.nivel_alerta end,
    'fuente_url', fuente_url_input,
    'fecha_publicacion', fecha_publicacion_input
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
alter table public.detecciones enable row level security;
alter table public.consentimientos enable row level security;
alter table public.terminos enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'usuarios', 'informacion_volcan', 'parametros_volcan', 'configuraciones_nivel',
    'alertas_volcan', 'recomendaciones_nivel', 'zonas_exclusion', 'acciones_requeridas',
    'puntos_encuentro', 'avisos_comunidad', 'mensajes_chat', 'logs_sistema',
    'detecciones', 'consentimientos', 'terminos'
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
-- PG 15+ re-chequea la policy SELECT sobre la fila nueva en UPDATE; el dueño y los
-- operadores deben poder ver filas inactivas para desactivar/reactivar avisos.
create policy community_read on public.avisos_comunidad for select to authenticated
  using (estado = 'activo' or usuario_id = auth.uid() or public.is_operator());
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

drop policy if exists detections_operator_read on public.detecciones;
create policy detections_operator_read on public.detecciones for select to authenticated
  using (public.is_operator());

drop policy if exists consents_own_read on public.consentimientos;
create policy consents_own_read on public.consentimientos for select to authenticated
  using (usuario_id = auth.uid() or public.is_operator());
drop policy if exists consents_own_insert on public.consentimientos;
create policy consents_own_insert on public.consentimientos for insert to authenticated
  with check (usuario_id = auth.uid());
drop policy if exists consents_own_update on public.consentimientos;
create policy consents_own_update on public.consentimientos for update to authenticated
  using (usuario_id = auth.uid() or public.is_operator())
  with check (usuario_id = auth.uid() or public.is_operator());

drop policy if exists terms_public_read on public.terminos;
create policy terms_public_read on public.terminos for select to anon, authenticated
  using (activo = true);

-- Las mutaciones sensibles pasan solo por las funciones anteriores.
revoke all on public.usuarios from anon, authenticated;
grant select (id, nombre, rol, fecha_creacion) on public.usuarios to authenticated;
grant select (telefono) on public.usuarios to authenticated;
grant select on public.perfiles_publicos to authenticated;
grant select on public.informacion_volcan, public.parametros_volcan, public.configuraciones_nivel,
  public.alertas_volcan, public.recomendaciones_nivel, public.zonas_exclusion,
  public.acciones_requeridas, public.puntos_encuentro to anon, authenticated;
grant select on public.terminos to anon, authenticated;
grant select (id, usuario_id, tipo, aceptado, version_terminos, fecha_decision, fecha_revocacion) on public.consentimientos to authenticated;
grant insert (usuario_id, tipo, aceptado, version_terminos, fecha_decision, fecha_revocacion) on public.consentimientos to authenticated;
grant update (aceptado, version_terminos, fecha_decision, fecha_revocacion) on public.consentimientos to authenticated;
grant all on public.detecciones to service_role;
revoke all on public.avisos_comunidad from authenticated;
grant select on public.avisos_comunidad to authenticated;
grant insert (usuario_id, mensaje) on public.avisos_comunidad to authenticated;
grant update (mensaje, estado) on public.avisos_comunidad to authenticated;
revoke all on public.mensajes_chat from authenticated;
grant select on public.mensajes_chat to authenticated;
grant insert (emisor_id, receptor_id, mensaje) on public.mensajes_chat to authenticated;
grant update (leido, fecha_lectura) on public.mensajes_chat to authenticated;
grant execute on function public.cambiar_nivel_alerta(text, text, timestamptz), public.cambiar_estado_punto_encuentro(uuid, boolean),
  public.resetear_puntos_encuentro() to authenticated;
revoke execute on function public.cambiar_nivel_alerta(text, text, timestamptz), public.cambiar_estado_punto_encuentro(uuid, boolean),
  public.resetear_puntos_encuentro() from public, anon;
grant execute on function public.is_operator() to authenticated;
revoke execute on function public.is_operator() from public, anon;

-- Health check read-only para que `pnpm doctor` pueda detectar instalaciones
-- existentes donde la publicación Realtime todavía no se aplicó.
create or replace function public.verificar_publicaciones_realtime()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'alertas_volcan', exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alertas_volcan'
    ),
    'puntos_encuentro', exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'puntos_encuentro'
    ),
    'avisos_comunidad', exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'avisos_comunidad'
    ),
    'mensajes_chat', exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes_chat'
    )
  );
$$;

revoke all on function public.verificar_publicaciones_realtime() from public;
grant execute on function public.verificar_publicaciones_realtime() to anon, authenticated, service_role;
revoke execute on function public.verificar_publicaciones_realtime() from public;

-- ---------------------------------------------------------------------------
-- 5. Seed inicial seguro e idempotente
-- ---------------------------------------------------------------------------

insert into public.informacion_volcan (
  nombre, codigo, altura_msnm, latitud, longitud, descripcion, tipo_volcan,
  laguna_lava, erupciones_registradas, ultima_erupcion_vei, riesgos_principales,
  fuente, fuente_url, ultima_verificacion
)
values (
  'Villarrica', 'VIL', 2847, -39.42000000, -71.93000000,
  'Volcán activo de la Región de La Araucanía, Chile. El perfil histórico incluye lago de lava y riesgo de lahares; los parámetros de monitoreo en tiempo real se mantienen sin datos oficiales en esta instalación.',
  'Estratovolcán', true, 152, 3, 'Lava, lahares y caída de tefra.',
  'Smithsonian Global Volcanism Program', 'https://volcano.si.edu/volcano.cfm?vn=357120', '2026-08-16T00:00:00Z'
)
on conflict (codigo) do update set nombre = excluded.nombre, altura_msnm = excluded.altura_msnm,
  latitud = excluded.latitud, longitud = excluded.longitud, descripcion = excluded.descripcion,
  tipo_volcan = excluded.tipo_volcan, laguna_lava = excluded.laguna_lava,
  erupciones_registradas = excluded.erupciones_registradas, ultima_erupcion_vei = excluded.ultima_erupcion_vei,
  riesgos_principales = excluded.riesgos_principales, fuente = excluded.fuente,
  fuente_url = excluded.fuente_url, ultima_verificacion = excluded.ultima_verificacion;

insert into public.configuraciones_nivel (nivel, color, text_color, bg_gradient, icon_name, label, descripcion_corta, urgencia, pulse_color)
values
  ('verde', 'emerald', 'dark', 'emerald', 'ShieldCheck', 'Alerta Verde', 'Actividad habitual', 'baja', 'none'),
  ('amarillo', 'yellow', 'dark', 'yellow', 'AlertTriangle', 'Alerta Amarilla', 'Actividad inestable', 'media', 'none'),
  ('naranja', 'orange', 'dark', 'orange', 'Flame', 'Alerta Naranja', 'Variación significativa', 'alta', 'one-shot'),
  ('rojo', 'red', 'light', 'red', 'Siren', 'Alerta Roja', 'Erupción mayor inminente o en curso', 'crítica', 'one-shot')
on conflict (nivel) do update set label = excluded.label, descripcion_corta = excluded.descripcion_corta,
  icon_name = excluded.icon_name, urgencia = excluded.urgencia;

insert into public.alertas_volcan (
  nivel_alerta, descripcion, fuente, referencia, fuente_url, fecha_publicacion,
  fecha_verificacion, es_simulacion, parametros_id, volcan_id
)
select 'verde', 'Nivel verde reportado por la fuente histórica cargada. Vulcania no es fuente oficial; contrasta el estado vigente antes de actuar.',
  'Smithsonian Global Volcanism Program', 'https://volcano.si.edu/volcano.cfm?vn=357120',
  'https://volcano.si.edu/volcano.cfm?vn=357120', '2026-03-11T00:00:00Z', '2026-08-16T00:00:00Z', false, null,
  (select id from public.informacion_volcan where codigo = 'VIL')
where not exists (select 1 from public.alertas_volcan);

update public.alertas_volcan
set nivel_alerta = 'verde',
    descripcion = 'Nivel verde reportado por la fuente histórica cargada. Vulcania no es fuente oficial; contrasta el estado vigente antes de actuar.',
    fuente = 'Smithsonian Global Volcanism Program',
    referencia = 'https://volcano.si.edu/volcano.cfm?vn=357120',
    fuente_url = 'https://volcano.si.edu/volcano.cfm?vn=357120',
    fecha_publicacion = '2026-03-11T00:00:00Z',
    fecha_verificacion = '2026-08-16T00:00:00Z',
    es_simulacion = false,
    parametros_id = null,
    volcan_id = (select id from public.informacion_volcan where codigo = 'VIL')
where referencia = 'SEED'
   or fuente = 'Seed de instalación Vulcania';

insert into public.terminos (tipo, version, titulo, ruta)
values
  ('terminos', '2026-08-16', 'Términos de uso de Vulcania', '/terminos'),
  ('privacidad', '2026-08-16', 'Política de privacidad de Vulcania', '/privacidad')
on conflict (tipo, version) do update set titulo = excluded.titulo, ruta = excluded.ruta, activo = true;

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

insert into public.zonas_exclusion (nivel_alerta, radio_km, descripcion, fuente, fuente_url, documento, fecha_fuente, trazabilidad)
values
  ('verde', 3, 'Zona técnica referencial de 3 km; plano oficial pendiente de confirmación.', 'Visor Chile Preparado / SENAPRED — fuente pendiente de verificación', 'https://www.senapred.cl/visor-preparado/', 'Plano Villarrica en actualización; importar capa oficial cuando sea publicada.', null, 'por_confirmar'),
  ('amarillo', 3, 'Zona técnica referencial de 3 km; plano oficial pendiente de confirmación.', 'Visor Chile Preparado / SENAPRED — fuente pendiente de verificación', 'https://www.senapred.cl/visor-preparado/', 'Plano Villarrica en actualización; importar capa oficial cuando sea publicada.', null, 'por_confirmar'),
  ('naranja', 8, 'Zona ampliada referencial de 8 km; plano oficial pendiente de confirmación.', 'Visor Chile Preparado / SENAPRED — fuente pendiente de verificación', 'https://www.senapred.cl/visor-preparado/', 'Plano Villarrica en actualización; importar capa oficial cuando sea publicada.', null, 'por_confirmar'),
  ('rojo', 15, 'Zona crítica referencial de 15 km; plano oficial pendiente de confirmación.', 'Visor Chile Preparado / SENAPRED — fuente pendiente de verificación', 'https://www.senapred.cl/visor-preparado/', 'Plano Villarrica en actualización; importar capa oficial cuando sea publicada.', null, 'por_confirmar')
on conflict (nivel_alerta) do update set radio_km = excluded.radio_km, descripcion = excluded.descripcion,
  fuente = excluded.fuente, fuente_url = excluded.fuente_url, documento = excluded.documento, fecha_fuente = excluded.fecha_fuente,
  trazabilidad = excluded.trazabilidad;

insert into public.acciones_requeridas (nivel_alerta, evacuar_zona_riesgo, activar_red_comunitaria, revisar_rutas_evacuacion, preparar_kit_emergencia)
values ('verde', false, false, true, false), ('amarillo', false, false, true, true),
  ('naranja', true, true, true, true), ('rojo', true, true, true, true)
on conflict (nivel_alerta) do update set evacuar_zona_riesgo = excluded.evacuar_zona_riesgo,
  activar_red_comunitaria = excluded.activar_red_comunitaria, revisar_rutas_evacuacion = excluded.revisar_rutas_evacuacion,
  preparar_kit_emergencia = excluded.preparar_kit_emergencia;

insert into public.puntos_encuentro (nombre, direccion, latitud, longitud, capacidad, seguridad_nivel, tiempo_aprox_pie, ocupado, fuente, fuente_url, documento, fecha_fuente, trazabilidad)
values
  ('Estadio Pucón', 'Centro de Pucón', -39.27960000, -71.97250000, 500, 4, 20, false, 'Datos demo históricos de Vulcania', 'https://www.senapred.cl/visor-preparado/', 'Fuente oficial pendiente de confirmación', null, 'por_confirmar'),
  ('Escuela Quelhue', 'Sector Quelhue', -39.25750000, -71.91770000, 250, 3, 35, false, 'Datos demo históricos de Vulcania', 'https://www.senapred.cl/visor-preparado/', 'Fuente oficial pendiente de confirmación', null, 'por_confirmar'),
  ('Club de Huasos', 'Piedra Amarilla', -39.35410000, -72.04290000, 300, 4, 45, false, 'Datos demo históricos de Vulcania', 'https://www.senapred.cl/visor-preparado/', 'Fuente oficial pendiente de confirmación', null, 'por_confirmar'),
  ('Mirador Puente Pellaifa', 'Camino a Coñaripe', -39.58891500, -72.01955300, 150, 4, 30, false, 'Datos demo históricos de Vulcania', 'https://www.senapred.cl/visor-preparado/', 'Fuente oficial pendiente de confirmación', null, 'por_confirmar')
on conflict (nombre) do update set direccion = excluded.direccion, latitud = excluded.latitud,
  longitud = excluded.longitud, capacidad = excluded.capacidad, seguridad_nivel = excluded.seguridad_nivel,
  tiempo_aprox_pie = excluded.tiempo_aprox_pie, fuente = excluded.fuente, fuente_url = excluded.fuente_url, documento = excluded.documento,
  fecha_fuente = excluded.fecha_fuente, trazabilidad = excluded.trazabilidad;

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

-- Verificación rápida (visible en SQL Editor): 15 tablas con RLS, alerta verde
-- inicial con fuente, datos históricos trazables, puntos por confirmar y cuatro
-- tablas publicadas para Realtime. El detector no publica alertas por sí mismo.

-- Programación externa (activar solo después de desplegar la Edge Function y
-- guardar el token en el proveedor de secretos; nunca pegues secretos aquí):
-- select cron.schedule('vulcan-detect-every-6h', '0 */6 * * *', $$
--   select net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/vulcan-detect',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <function-secret>'),
--     body := '{}'::jsonb
--   );
-- $$);
