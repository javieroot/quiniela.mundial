-- Endurece el registro público sin exponer datos personales completos.
-- 1) Permite consultar de forma segura si un username ya existe antes de auth.signUp().
-- 2) Alinea la restricción de usernames nuevos con la validación frontend: minúsculas, números, _ y -.

create or replace function public.username_exists(check_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where username = lower(trim(coalesce(check_username, '')))
  );
$$;

revoke all on function public.username_exists(text) from public;
grant execute on function public.username_exists(text) to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_username_check'
  ) then
    alter table public.profiles drop constraint profiles_username_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_username_check
  check (username ~ '^[a-z0-9_-]{3,20}$') not valid;
