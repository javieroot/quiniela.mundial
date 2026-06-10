-- Pronostix v2 - seed base de producción / staging
-- Ejecuta después de sql/schema.sql en una base limpia.
-- No crea usuarios ni pronósticos. No inventa datos oficiales completos.
-- Ajusta nombres, equipos, fechas, sedes y jugadores antes de producción real.

begin;

insert into public.settings(
  id,
  entry_fee,
  admin_percentage,
  first_place_percentage,
  second_place_percentage,
  third_place_percentage,
  lock_minutes_before_match,
  results_api_enabled,
  special_results_api_enabled
)
values (1, 100, 10, 50, 30, 20, 1, false, false)
on conflict (id) do update set
  entry_fee = excluded.entry_fee,
  admin_percentage = excluded.admin_percentage,
  first_place_percentage = excluded.first_place_percentage,
  second_place_percentage = excluded.second_place_percentage,
  third_place_percentage = excluded.third_place_percentage,
  lock_minutes_before_match = excluded.lock_minutes_before_match,
  results_api_enabled = excluded.results_api_enabled,
  special_results_api_enabled = excluded.special_results_api_enabled;

insert into public.tournaments(id, name, starts_at, is_active)
values ('00000000-0000-0000-0000-000000000101', 'Torneo Pronostix 2026', '2026-06-11 00:00:00+00', true)
on conflict (id) do update set name = excluded.name, starts_at = excluded.starts_at, is_active = excluded.is_active;

-- Equipos placeholder. Reemplaza/expande con lista oficial antes de producción.
insert into public.teams(id, tournament_id, name, code) values
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'México', 'MEX'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', 'Argentina', 'ARG'),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', 'Brasil', 'BRA'),
('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000101', 'Francia', 'FRA')
on conflict (id) do update set name = excluded.name, code = excluded.code;

-- Jugadores candidatos placeholder para máximo goleador.
insert into public.players(id, tournament_id, team_id, name) values
('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', 'Jugador México 1'),
('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000202', 'Jugador Argentina 1'),
('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000203', 'Jugador Brasil 1'),
('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000204', 'Jugador Francia 1')
on conflict (id) do update set team_id = excluded.team_id, name = excluded.name;

-- Partidos placeholder. Confirma calendario, grupo/fase, estadio y ciudad antes de producción.
insert into public.matches(id, tournament_id, home_team_id, away_team_id, kickoff_at, group_name, stadium, city, home_score, away_score, status) values
('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202', '2026-06-11 00:00:00+00', 'Grupo/Fase por confirmar', 'Estadio por confirmar', 'Ciudad por confirmar', null, null, 'SCHEDULED'),
('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000204', '2026-06-12 00:00:00+00', 'Grupo/Fase por confirmar', 'Estadio por confirmar', 'Ciudad por confirmar', null, null, 'SCHEDULED')
on conflict (id) do update set
  kickoff_at = excluded.kickoff_at,
  group_name = excluded.group_name,
  stadium = excluded.stadium,
  city = excluded.city,
  status = excluded.status;

commit;
