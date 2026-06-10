-- Pronostix v2 - validación de seeds Mundial FIFA 2026
-- Solo lectura. No modifica datos.
-- Ejecuta después de:
--   1) sql/seed_worldcup_2026.sql
--   2) sql/seed_worldcup_2026_players_candidates.sql

-- Conteos generales solicitados.
select count(*) as teams_count from public.teams;
select count(*) as matches_count from public.matches;
select count(*) as players_count from public.players;

select count(distinct group_name) as distinct_group_name_count from public.matches;
select count(distinct stadium) as distinct_stadium_count from public.matches;
select count(distinct city) as distinct_city_count from public.matches;

-- Conteos esperados para el torneo Mundial FIFA 2026 cargado por seed.
select count(*) as worldcup_2026_teams_count
from public.teams
where tournament_id = '20260000-0000-0000-0000-000000000001';

select count(*) as worldcup_2026_matches_count
from public.matches
where tournament_id = '20260000-0000-0000-0000-000000000001';

select count(*) as worldcup_2026_players_count
from public.players
where tournament_id = '20260000-0000-0000-0000-000000000001';

select count(distinct group_name) as worldcup_2026_distinct_group_name_count
from public.matches
where tournament_id = '20260000-0000-0000-0000-000000000001';

select count(distinct stadium) as worldcup_2026_distinct_stadium_count
from public.matches
where tournament_id = '20260000-0000-0000-0000-000000000001';

select count(distinct city) as worldcup_2026_distinct_city_count
from public.matches
where tournament_id = '20260000-0000-0000-0000-000000000001';

-- Equipos duplicados por torneo + code.
select tournament_id, code, count(*) as duplicates
from public.teams
group by tournament_id, code
having count(*) > 1
order by tournament_id, code;

-- Equipos duplicados por torneo + name.
select tournament_id, name, count(*) as duplicates
from public.teams
group by tournament_id, name
having count(*) > 1
order by tournament_id, name;

-- Jugadores duplicados por torneo + name.
select tournament_id, name, count(*) as duplicates
from public.players
group by tournament_id, name
having count(*) > 1
order by tournament_id, name;

-- Partidos sin estadio.
select id, tournament_id, kickoff_at, group_name, stadium, city
from public.matches
where stadium is null or btrim(stadium) = ''
order by kickoff_at, id;

-- Partidos sin ciudad.
select id, tournament_id, kickoff_at, group_name, stadium, city
from public.matches
where city is null or btrim(city) = ''
order by kickoff_at, id;

-- Partidos sin kickoff_at.
select id, tournament_id, kickoff_at, group_name, stadium, city
from public.matches
where kickoff_at is null
order by id;

-- Partidos con el mismo equipo como local y visitante.
select id, tournament_id, kickoff_at, home_team_id, away_team_id
from public.matches
where home_team_id = away_team_id
order by kickoff_at, id;

-- Jugadores sin team_id.
select id, tournament_id, name, team_id
from public.players
where team_id is null
order by tournament_id, name;

-- Resumen booleano rápido: todos deben ser 0 en *_issues.
select
  (select count(*) from public.teams t join (
    select tournament_id, code from public.teams group by tournament_id, code having count(*) > 1
  ) d on d.tournament_id = t.tournament_id and d.code = t.code) as duplicated_team_code_issues,
  (select count(*) from public.teams t join (
    select tournament_id, name from public.teams group by tournament_id, name having count(*) > 1
  ) d on d.tournament_id = t.tournament_id and d.name = t.name) as duplicated_team_name_issues,
  (select count(*) from public.players p join (
    select tournament_id, name from public.players group by tournament_id, name having count(*) > 1
  ) d on d.tournament_id = p.tournament_id and d.name = p.name) as duplicated_player_issues,
  (select count(*) from public.matches where stadium is null or btrim(stadium) = '') as matches_without_stadium_issues,
  (select count(*) from public.matches where city is null or btrim(city) = '') as matches_without_city_issues,
  (select count(*) from public.matches where kickoff_at is null) as matches_without_kickoff_issues,
  (select count(*) from public.matches where home_team_id = away_team_id) as same_home_away_team_issues,
  (select count(*) from public.players where team_id is null) as players_without_team_issues;
