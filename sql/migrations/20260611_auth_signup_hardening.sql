create or replace function public.username_exists(check_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where username = lower(trim(check_username))
  );
$$;

revoke all on function public.username_exists(text) from public;
grant execute on function public.username_exists(text) to anon;
grant execute on function public.username_exists(text) to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_username_check'
  ) then
    alter table public.profiles
      drop constraint profiles_username_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_username_check
  check (username ~ '^[a-z0-9_-]{3,20}$')
  not valid;

comment on function public.username_exists(text) is
  'Checks if a normalized username already exists without exposing profile rows to clients.';

comment on constraint profiles_username_check on public.profiles is
  'Ensures usernames match the public signup rule: lowercase letters, numbers, underscore or hyphen, 3 to 20 chars.';
