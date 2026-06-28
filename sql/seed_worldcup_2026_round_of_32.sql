-- Pronostix v2 - seed Mundial FIFA 2026, ronda de 32
-- Información verificada el 2026-06-28: la fase de grupos terminó y los 16 cruces de ronda de 32 ya están definidos.
-- Fuentes consultadas: FIFA Match Centre / calendario oficial para sedes y horarios UTC; FOX y Economic Times para confirmación de cruces.
-- Nota operativa: Match 73 ya se incluye como FINALIZADO según reportes del 2026-06-28 (Sudáfrica 0-1 Canadá).

begin;

insert into public.matches(id, tournament_id, home_team_id, away_team_id, kickoff_at, group_name, stadium, city, home_score, away_score, status) values
('20260000-0000-0000-0000-000000000473', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000202', '20260000-0000-0000-0000-000000000205', '2026-06-28 19:00:00+00', 'Ronda de 32', 'Estadio de Los Ángeles', 'Los Ángeles', 0, 1, 'FINISHED'),
('20260000-0000-0000-0000-000000000474', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000219', '20260000-0000-0000-0000-000000000214', '2026-06-29 20:30:00+00', 'Ronda de 32', 'Estadio de Boston', 'Boston', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000475', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000221', '20260000-0000-0000-0000-000000000210', '2026-06-30 01:00:00+00', 'Ronda de 32', 'Estadio de Monterrey', 'Monterrey', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000476', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000209', '20260000-0000-0000-0000-000000000222', '2026-06-29 17:00:00+00', 'Ronda de 32', 'Estadio de Houston', 'Houston', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000477', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000233', '20260000-0000-0000-0000-000000000223', '2026-06-30 21:00:00+00', 'Ronda de 32', 'Estadio Nueva York/Nueva Jersey', 'Nueva York/Nueva Jersey', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000478', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000217', '20260000-0000-0000-0000-000000000236', '2026-06-30 17:00:00+00', 'Ronda de 32', 'Estadio de Dallas', 'Dallas', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000479', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000201', '20260000-0000-0000-0000-000000000218', '2026-07-01 01:00:00+00', 'Ronda de 32', 'Estadio Ciudad de México', 'Ciudad de México', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000480', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000247', '20260000-0000-0000-0000-000000000242', '2026-07-01 16:00:00+00', 'Ronda de 32', 'Estadio de Atlanta', 'Atlanta', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000481', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000213', '20260000-0000-0000-0000-000000000206', '2026-07-02 00:00:00+00', 'Ronda de 32', 'Estadio del Área de la Bahía de San Francisco', 'Área de la Bahía de San Francisco', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000482', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000227', '20260000-0000-0000-0000-000000000234', '2026-07-01 20:00:00+00', 'Ronda de 32', 'Estadio de Seattle', 'Seattle', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000483', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000241', '20260000-0000-0000-0000-000000000248', '2026-07-02 23:00:00+00', 'Ronda de 32', 'Estadio de Miami', 'Miami', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000484', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000231', '20260000-0000-0000-0000-000000000239', '2026-07-02 19:00:00+00', 'Ronda de 32', 'Estadio de Kansas City', 'Kansas City', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000485', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000208', '20260000-0000-0000-0000-000000000238', '2026-07-03 03:00:00+00', 'Ronda de 32', 'Estadio de Vancouver', 'Vancouver', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000486', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000237', '20260000-0000-0000-0000-000000000232', '2026-07-03 22:00:00+00', 'Ronda de 32', 'Estadio de Dallas', 'Dallas', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000487', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000244', '20260000-0000-0000-0000-000000000245', '2026-07-04 01:30:00+00', 'Ronda de 32', 'Estadio de Miami', 'Miami', null, null, 'SCHEDULED'),
('20260000-0000-0000-0000-000000000488', '20260000-0000-0000-0000-000000000001', '20260000-0000-0000-0000-000000000215', '20260000-0000-0000-0000-000000000228', '2026-07-03 18:00:00+00', 'Ronda de 32', 'Estadio de Dallas', 'Dallas', null, null, 'SCHEDULED')
on conflict (id) do update set
  tournament_id = excluded.tournament_id,
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  kickoff_at = excluded.kickoff_at,
  group_name = excluded.group_name,
  stadium = excluded.stadium,
  city = excluded.city,
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  status = excluded.status,
  updated_at = now();

commit;

-- Validaciones esperadas:
-- select count(*) from public.matches where tournament_id = '20260000-0000-0000-0000-000000000001' and group_name = 'Ronda de 32'; -- 16
-- select count(*) from public.matches where tournament_id = '20260000-0000-0000-0000-000000000001'; -- 88 si se cargó después de sql/seed_worldcup_2026.sql
