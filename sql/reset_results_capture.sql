-- Pronostix - limpiar capturas de resultados para volver a probar sincronización/API.
-- Conserva usuarios, pagos, roles, pronósticos de usuarios, especiales de usuarios,
-- equipos, jugadores, calendario, settings y torneo.

begin;

-- 1) Borra resultados especiales oficiales capturados por admin.
delete from public.special_results
where tournament_id is not null;

-- 2) Limpia marcadores y estado de partidos del torneo activo Mundial 2026.
update public.matches
set
  home_score = null,
  away_score = null,
  status = 'SCHEDULED'
where tournament_id = '20260000-0000-0000-0000-000000000001';

-- 3) Opcional: borra bitácora/histórico de sincronización API/manual de resultados.
-- Si quieres conservar auditoría, comenta este bloque antes de ejecutar.
delete from public.api_sync_logs
where tournament_id = '20260000-0000-0000-0000-000000000001'
  and sync_type = 'results';

commit;

-- Verificación sugerida después de ejecutar:
-- select count(*) as matches_with_results
-- from public.matches
-- where tournament_id = '20260000-0000-0000-0000-000000000001'
--   and (status <> 'SCHEDULED' or home_score is not null or away_score is not null);
--
-- select count(*) as special_results_count
-- from public.special_results
-- where tournament_id = '20260000-0000-0000-0000-000000000001';
--
-- select count(*) as result_sync_logs_count
-- from public.api_sync_logs
-- where tournament_id = '20260000-0000-0000-0000-000000000001'
--   and sync_type = 'results';
