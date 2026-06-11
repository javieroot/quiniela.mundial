-- Pronostix v2 - verificación pre-producción de limpieza
-- Ejecutar en Supabase SQL Editor después de aplicar limpiezas/migraciones y antes de liberar.
-- Objetivo: detectar datos dummy o capturas/resultados que NO deben quedar si aún estás cerrando pruebas.

with dummy_users(id) as (
  values
  ('00000000-0000-0000-0000-000000000001'::uuid),
  ('00000000-0000-0000-0000-000000000002'::uuid),
  ('00000000-0000-0000-0000-000000000003'::uuid),
  ('00000000-0000-0000-0000-000000000004'::uuid),
  ('00000000-0000-0000-0000-000000000005'::uuid),
  ('00000000-0000-0000-0000-000000000006'::uuid)
), checks as (
  select 'profiles_dummy' as check_name, count(*)::int as found from public.profiles p join dummy_users d on d.id = p.id
  union all
  select 'auth_users_dummy', count(*)::int from auth.users u join dummy_users d on d.id = u.id
  union all
  select 'predictions_total', count(*)::int from public.predictions
  union all
  select 'special_predictions_total', count(*)::int from public.special_predictions
  union all
  select 'special_results_total', count(*)::int from public.special_results
  union all
  select 'matches_finished_or_scored', count(*)::int from public.matches where status <> 'SCHEDULED' or home_score is not null or away_score is not null
  union all
  select 'settings_missing', case when exists(select 1 from public.settings where id = 1) then 0 else 1 end
  union all
  select 'settings_entry_fee_not_200', count(*)::int from public.settings where id = 1 and entry_fee <> 200
  union all
  select 'settings_prizes_not_50_25_15_10', count(*)::int from public.settings where id = 1 and (first_place_percentage <> 50 or second_place_percentage <> 25 or third_place_percentage <> 15 or admin_percentage <> 10)
  union all
  select 'settings_lock_not_1_minute', count(*)::int from public.settings where id = 1 and lock_minutes_before_match <> 1
)
select
  check_name,
  found,
  case when found = 0 then 'OK' else 'REVISAR' end as status
from checks
order by check_name;
