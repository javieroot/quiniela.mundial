-- Pronostix v2 - roles y mantenimiento administrativo seguro
-- Para qué sirve:
--   Agrega roles operativos ROOT/ADMIN/USER y RPCs de mantenimiento protegidas en SQL.
-- Cuándo ejecutarla:
--   En bases existentes después de sql/schema.sql y antes de usar el panel de mantenimiento/admin roles.
-- Qué agrega:
--   profiles.role, helpers is_root/is_admin, set_profile_role(), reset_user_entries(), reset_tournament_results() y reset_full_test().
-- Qué NO hace:
--   No crea usuarios, no borra calendario base, no cambia equipos/partidos/jugadores y no ejecuta seeds.
-- Nota de seguridad:
--   Los reset validan auth.uid() y privilegios ROOT/ADMIN dentro de SQL; cada función limpia únicamente su alcance documentado.

begin;

alter table public.profiles
  add column if not exists role varchar(10) not null default 'USER';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('ROOT', 'ADMIN', 'USER'));

-- Compatibilidad con is_admin existente.
update public.profiles
set role = case
  when username = 'admin' then 'ROOT'
  when username = 'javieroot' then 'ADMIN'
  when is_admin = true then 'ADMIN'
  else 'USER'
end
where role is null or role = 'USER';

update public.profiles
set is_admin = (role in ('ROOT', 'ADMIN'));

comment on column public.profiles.role is 'Rol operativo Pronostix: ROOT administra privilegios; ADMIN opera torneo; USER participa sin permisos administrativos.';

create or replace function public.is_root(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'ROOT');
$$;

revoke execute on function public.is_root(uuid) from public, anon;
grant execute on function public.is_root(uuid) to authenticated;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = uid
      and (p.is_admin = true or p.role in ('ROOT', 'ADMIN'))
  );
$$;

revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.sync_profile_admin_from_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.is_admin = (new.role in ('ROOT', 'ADMIN'));
  return new;
end;
$$;

drop trigger if exists sync_profile_admin_from_role on public.profiles;
create trigger sync_profile_admin_from_role
before insert or update of role on public.profiles
for each row execute function public.sync_profile_admin_from_role();

drop policy if exists "admin profiles" on public.profiles;
drop policy if exists "root profiles update" on public.profiles;
drop policy if exists "admin profiles participant update" on public.profiles;

revoke update on public.profiles from authenticated;
grant update (payment_status, username, display_name) on public.profiles to authenticated;

create policy "root profiles update" on public.profiles
for update to authenticated
using (public.is_root())
with check (true);

create policy "admin profiles participant update" on public.profiles
for update to authenticated
using (public.is_admin() and role <> 'ROOT')
with check (role <> 'ROOT');

create or replace function public.set_profile_role(target_profile_id uuid, new_role varchar)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not public.is_root(auth.uid()) then
    raise exception 'Solo ROOT puede modificar roles';
  end if;

  if new_role not in ('ROOT', 'ADMIN', 'USER') then
    raise exception 'Rol inválido: %', new_role;
  end if;

  update public.profiles
  set role = new_role,
      is_admin = (new_role in ('ROOT', 'ADMIN'))
  where id = target_profile_id;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end;
$$;

revoke execute on function public.set_profile_role(uuid, varchar) from public, anon;
grant execute on function public.set_profile_role(uuid, varchar) to authenticated;

create or replace function public.assert_current_user_admin()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not public.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;
end;
$$;

revoke execute on function public.assert_current_user_admin() from public, anon;
grant execute on function public.assert_current_user_admin() to authenticated;

create or replace function public.reset_user_entries()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_current_user_admin();

  -- Limpia SOLO capturas de usuarios. No toca resultados del torneo.
  delete from public.predictions where id is not null;
  delete from public.special_predictions where id is not null;
end;
$$;

comment on function public.reset_user_entries() is 'Limpia SOLO capturas de usuarios: predictions y special_predictions. Valida auth.uid() y privilegios ROOT/ADMIN; conserva resultados, usuarios/profiles, auth.users, pagos, roles, tournaments, settings, teams, matches como calendario y players.';
revoke execute on function public.reset_user_entries() from public, anon;
grant execute on function public.reset_user_entries() to authenticated;

create or replace function public.reset_tournament_results()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_current_user_admin();

  -- Limpia SOLO resultados del torneo. No toca capturas de usuarios.
  delete from public.special_results where tournament_id is not null;

  update public.matches
  set home_score = null,
      away_score = null,
      status = 'SCHEDULED'
  where home_score is not null
     or away_score is not null
     or status <> 'SCHEDULED';
end;
$$;

comment on function public.reset_tournament_results() is 'Limpia SOLO resultados del torneo: special_results y home_score/away_score/status en matches. Valida auth.uid() y privilegios ROOT/ADMIN; conserva predictions, special_predictions, usuarios/profiles, auth.users, pagos, roles, tournaments, settings, teams, matches como calendario y players.';
revoke execute on function public.reset_tournament_results() from public, anon;
grant execute on function public.reset_tournament_results() to authenticated;

create or replace function public.reset_full_test()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_current_user_admin();

  -- Reinicio completo de prueba: borra capturas de usuarios y resultados capturados.
  delete from public.predictions where id is not null;
  delete from public.special_predictions where id is not null;
  delete from public.special_results where tournament_id is not null;

  update public.matches
  set home_score = null,
      away_score = null,
      status = 'SCHEDULED'
  where home_score is not null
     or away_score is not null
     or status <> 'SCHEDULED';
end;
$$;

comment on function public.reset_full_test() is 'Reinicia prueba completa: borra predictions, special_predictions, special_results y limpia resultados en matches. Valida auth.uid() y privilegios ROOT/ADMIN; conserva usuarios/profiles, auth.users, pagos, roles, tournaments, settings, teams, matches como calendario y players.';
revoke execute on function public.reset_full_test() from public, anon;
grant execute on function public.reset_full_test() to authenticated;

-- El flujo nuevo usa reset_user_entries(), reset_tournament_results() y reset_full_test().
-- Si existía el nombre anterior, se elimina para evitar ambigüedad operacional.
drop function if exists public.reset_test_data();

commit;
