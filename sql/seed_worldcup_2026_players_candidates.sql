-- Pronostix v2 - candidatos a máximo goleador Mundial FIFA 2026
-- Fuente preferida: FIFA confirmó 1,248 jugadores en 48 selecciones.
-- Este seed NO intenta cargar los 1,248 jugadores completos: carga 3 candidatos razonables por selección.
-- Requiere ejecutar antes sql/seed_worldcup_2026.sql para que existan tournament y teams.
-- No toca teams, matches, tournaments ni schema. Solo inserta/actualiza public.players.

begin;

create temp table pronostix_wc2026_player_seed(
  team_code text not null,
  player_name text not null
) on commit drop;

insert into pronostix_wc2026_player_seed(team_code, player_name) values
('MEX', 'Santiago Giménez'),
('MEX', 'Hirving Lozano'),
('MEX', 'Henry Martín'),
('RSA', 'Lyle Foster'),
('RSA', 'Percy Tau'),
('RSA', 'Evidence Makgopa'),
('KOR', 'Son Heung-min'),
('KOR', 'Hwang Hee-chan'),
('KOR', 'Lee Kang-in'),
('CZE', 'Patrik Schick'),
('CZE', 'Adam Hložek'),
('CZE', 'Tomáš Souček'),
('CAN', 'Jonathan David'),
('CAN', 'Alphonso Davies'),
('CAN', 'Cyle Larin'),
('BIH', 'Edin Džeko'),
('BIH', 'Ermedin Demirović'),
('BIH', 'Amar Dedić'),
('QAT', 'Akram Afif'),
('QAT', 'Almoez Ali'),
('QAT', 'Hassan Al-Haydos'),
('SUI', 'Breel Embolo'),
('SUI', 'Xherdan Shaqiri'),
('SUI', 'Dan Ndoye'),
('BRA', 'Vinícius Júnior'),
('BRA', 'Rodrygo'),
('BRA', 'Endrick'),
('MAR', 'Youssef En-Nesyri'),
('MAR', 'Achraf Hakimi'),
('MAR', 'Brahim Díaz'),
('HAI', 'Frantzdy Pierrot'),
('HAI', 'Duckens Nazon'),
('HAI', 'Carnejy Antoine'),
('SCO', 'Scott McTominay'),
('SCO', 'Che Adams'),
('SCO', 'John McGinn'),
('USA', 'Christian Pulisic'),
('USA', 'Folarin Balogun'),
('USA', 'Ricardo Pepi'),
('PAR', 'Miguel Almirón'),
('PAR', 'Julio Enciso'),
('PAR', 'Ramón Sosa'),
('AUS', 'Mitchell Duke'),
('AUS', 'Kusini Yengi'),
('AUS', 'Craig Goodwin'),
('TUR', 'Hakan Çalhanoğlu'),
('TUR', 'Arda Güler'),
('TUR', 'Kenan Yıldız'),
('CIV', 'Sébastien Haller'),
('CIV', 'Simon Adingra'),
('CIV', 'Franck Kessié'),
('ECU', 'Enner Valencia'),
('ECU', 'Moisés Caicedo'),
('ECU', 'Kendry Páez'),
('GER', 'Jamal Musiala'),
('GER', 'Florian Wirtz'),
('GER', 'Kai Havertz'),
('CUW', 'Juninho Bacuna'),
('CUW', 'Rangelo Janga'),
('CUW', 'Gervane Kastaneer'),
('NED', 'Cody Gakpo'),
('NED', 'Memphis Depay'),
('NED', 'Xavi Simons'),
('JPN', 'Takumi Minamino'),
('JPN', 'Ritsu Doan'),
('JPN', 'Takefusa Kubo'),
('SWE', 'Alexander Isak'),
('SWE', 'Viktor Gyökeres'),
('SWE', 'Dejan Kulusevski'),
('TUN', 'Elias Achouri'),
('TUN', 'Youssef Msakni'),
('TUN', 'Seifeddine Jaziri'),
('IRN', 'Mehdi Taremi'),
('IRN', 'Sardar Azmoun'),
('IRN', 'Alireza Jahanbakhsh'),
('NZL', 'Chris Wood'),
('NZL', 'Sarpreet Singh'),
('NZL', 'Kosta Barbarouses'),
('BEL', 'Romelu Lukaku'),
('BEL', 'Kevin De Bruyne'),
('BEL', 'Jérémy Doku'),
('EGY', 'Mohamed Salah'),
('EGY', 'Omar Marmoush'),
('EGY', 'Mostafa Mohamed'),
('KSA', 'Salem Al-Dawsari'),
('KSA', 'Firas Al-Buraikan'),
('KSA', 'Saleh Al-Shehri'),
('URU', 'Darwin Núñez'),
('URU', 'Federico Valverde'),
('URU', 'Facundo Pellistri'),
('ESP', 'Lamine Yamal'),
('ESP', 'Álvaro Morata'),
('ESP', 'Nico Williams'),
('CPV', 'Ryan Mendes'),
('CPV', 'Garry Rodrigues'),
('CPV', 'Bebé'),
('FRA', 'Kylian Mbappé'),
('FRA', 'Ousmane Dembélé'),
('FRA', 'Antoine Griezmann'),
('SEN', 'Sadio Mané'),
('SEN', 'Nicolas Jackson'),
('SEN', 'Ismaïla Sarr'),
('IRQ', 'Aymen Hussein'),
('IRQ', 'Ali Jasim'),
('IRQ', 'Mohanad Ali'),
('NOR', 'Erling Haaland'),
('NOR', 'Martin Ødegaard'),
('NOR', 'Alexander Sørloth'),
('ARG', 'Lionel Messi'),
('ARG', 'Lautaro Martínez'),
('ARG', 'Julián Álvarez'),
('ALG', 'Riyad Mahrez'),
('ALG', 'Amine Gouiri'),
('ALG', 'Baghdad Bounedjah'),
('AUT', 'Marko Arnautović'),
('AUT', 'Michael Gregoritsch'),
('AUT', 'Marcel Sabitzer'),
('JOR', 'Mousa Al-Taamari'),
('JOR', 'Yazan Al-Naimat'),
('JOR', 'Ali Olwan'),
('POR', 'Cristiano Ronaldo'),
('POR', 'Rafael Leão'),
('POR', 'Gonçalo Ramos'),
('COD', 'Cédric Bakambu'),
('COD', 'Yoane Wissa'),
('COD', 'Silas'),
('UZB', 'Eldor Shomurodov'),
('UZB', 'Abbosbek Fayzullaev'),
('UZB', 'Jaloliddin Masharipov'),
('COL', 'Luis Díaz'),
('COL', 'James Rodríguez'),
('COL', 'Jhon Durán'),
('GHA', 'Mohammed Kudus'),
('GHA', 'Iñaki Williams'),
('GHA', 'Jordan Ayew'),
('PAN', 'José Fajardo'),
('PAN', 'Ismael Díaz'),
('PAN', 'Cecilio Waterman'),
('ENG', 'Harry Kane'),
('ENG', 'Jude Bellingham'),
('ENG', 'Phil Foden'),
('CRO', 'Andrej Kramarić'),
('CRO', 'Luka Modrić'),
('CRO', 'Ivan Perišić');

do $$
declare
  missing_codes text;
begin
  select string_agg(distinct ps.team_code, ', ' order by ps.team_code)
  into missing_codes
  from pronostix_wc2026_player_seed ps
  left join public.teams t
    on t.tournament_id = '20260000-0000-0000-0000-000000000001'
   and t.code = ps.team_code
  where t.id is null;

  if missing_codes is not null then
    raise exception 'Faltan equipos para seed_worldcup_2026_players_candidates.sql: %', missing_codes;
  end if;
end $$;

insert into public.players(tournament_id, team_id, name)
select
  '20260000-0000-0000-0000-000000000001'::uuid as tournament_id,
  t.id as team_id,
  ps.player_name as name
from pronostix_wc2026_player_seed ps
join public.teams t
  on t.tournament_id = '20260000-0000-0000-0000-000000000001'
 and t.code = ps.team_code
on conflict (tournament_id, name) do update set
  team_id = excluded.team_id,
  name = excluded.name;

commit;

-- Validaciones esperadas:
-- Total jugadores insertados:
-- select count(*) from public.players where tournament_id = '20260000-0000-0000-0000-000000000001'; -- 144
-- Jugadores por selección:
-- select t.code, t.name, count(p.id) as players_count
-- from public.teams t
-- left join public.players p on p.team_id = t.id
-- where t.tournament_id = '20260000-0000-0000-0000-000000000001'
-- group by t.code, t.name
-- order by t.code; -- 3 por selección
-- Validación de team_id:
-- select count(*) as players_without_team
-- from public.players
-- where tournament_id = '20260000-0000-0000-0000-000000000001'
--   and team_id is null; -- 0
