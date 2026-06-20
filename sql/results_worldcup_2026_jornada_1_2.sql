-- Pronostix - resultados oficiales Mundial 2026
-- Jornada 1 completa + Jornada 2 completada para grupos A, B, C y D.
-- Ejecutar en Supabase SQL Editor cuando se quiera corregir/cargar resultados oficiales.
-- No toca rankings, premios, usuarios ni pronósticos.

begin;

-- Limpia marcadores accidentales guardados en partidos que NO están finalizados.
-- Esto corrige ceros que pudo guardar un proveedor externo para partidos futuros/en vivo.
update public.matches
set
  home_score = null,
  away_score = null
where status <> 'FINISHED'
  and home_score is not null
  and away_score is not null;

with results(match_id, home_score, away_score) as (
  values
    -- Jornada 1 completada
    ('20260000-0000-0000-0000-000000000401'::uuid, 2, 0), -- Grupo A: México 2 - 0 Sudáfrica
    ('20260000-0000-0000-0000-000000000402'::uuid, 2, 1), -- Grupo A: Corea del Sur 2 - 1 Chequia
    ('20260000-0000-0000-0000-000000000403'::uuid, 1, 1), -- Grupo B: Canadá 1 - 1 Bosnia y Herzegovina
    ('20260000-0000-0000-0000-000000000404'::uuid, 4, 1), -- Grupo D: Estados Unidos 4 - 1 Paraguay
    ('20260000-0000-0000-0000-000000000405'::uuid, 1, 1), -- Grupo B: Catar 1 - 1 Suiza
    ('20260000-0000-0000-0000-000000000406'::uuid, 1, 1), -- Grupo C: Brasil 1 - 1 Marruecos
    ('20260000-0000-0000-0000-000000000407'::uuid, 0, 1), -- Grupo C: Haití 0 - 1 Escocia
    ('20260000-0000-0000-0000-000000000408'::uuid, 2, 0), -- Grupo D: Australia 2 - 0 Turquía
    ('20260000-0000-0000-0000-000000000409'::uuid, 1, 0), -- Grupo E: Costa de Marfil 1 - 0 Ecuador
    ('20260000-0000-0000-0000-000000000410'::uuid, 7, 1), -- Grupo E: Alemania 7 - 1 Curazao
    ('20260000-0000-0000-0000-000000000411'::uuid, 2, 2), -- Grupo F: Países Bajos 2 - 2 Japón
    ('20260000-0000-0000-0000-000000000412'::uuid, 5, 1), -- Grupo F: Suecia 5 - 1 Túnez
    ('20260000-0000-0000-0000-000000000413'::uuid, 2, 2), -- Grupo G: Irán 2 - 2 Nueva Zelanda
    ('20260000-0000-0000-0000-000000000414'::uuid, 1, 1), -- Grupo G: Bélgica 1 - 1 Egipto
    ('20260000-0000-0000-0000-000000000415'::uuid, 1, 1), -- Grupo H: Arabia Saudita 1 - 1 Uruguay
    ('20260000-0000-0000-0000-000000000416'::uuid, 0, 0), -- Grupo H: España 0 - 0 Cabo Verde
    ('20260000-0000-0000-0000-000000000417'::uuid, 3, 1), -- Grupo I: Francia 3 - 1 Senegal
    ('20260000-0000-0000-0000-000000000418'::uuid, 1, 4), -- Grupo I: Irak 1 - 4 Noruega
    ('20260000-0000-0000-0000-000000000419'::uuid, 3, 0), -- Grupo J: Argentina 3 - 0 Argelia
    ('20260000-0000-0000-0000-000000000420'::uuid, 3, 1), -- Grupo J: Austria 3 - 1 Jordania
    ('20260000-0000-0000-0000-000000000421'::uuid, 1, 1), -- Grupo K: Portugal 1 - 1 RD Congo
    ('20260000-0000-0000-0000-000000000422'::uuid, 1, 3), -- Grupo K: Uzbekistán 1 - 3 Colombia
    ('20260000-0000-0000-0000-000000000423'::uuid, 1, 0), -- Grupo L: Ghana 1 - 0 Panamá
    ('20260000-0000-0000-0000-000000000424'::uuid, 4, 2), -- Grupo L: Inglaterra 4 - 2 Croacia

    -- Jornada 2 actualizada
    ('20260000-0000-0000-0000-000000000425'::uuid, 1, 1), -- Grupo A: Chequia 1 - 1 Sudáfrica
    ('20260000-0000-0000-0000-000000000426'::uuid, 1, 0), -- Grupo A: México 1 - 0 Corea del Sur
    ('20260000-0000-0000-0000-000000000427'::uuid, 4, 1), -- Grupo B: Suiza 4 - 1 Bosnia y Herzegovina
    ('20260000-0000-0000-0000-000000000428'::uuid, 6, 0), -- Grupo B: Canadá 6 - 0 Catar
    ('20260000-0000-0000-0000-000000000429'::uuid, 0, 1), -- Grupo C: Escocia 0 - 1 Marruecos
    ('20260000-0000-0000-0000-000000000430'::uuid, 3, 0), -- Grupo C: Brasil 3 - 0 Haití
    ('20260000-0000-0000-0000-000000000431'::uuid, 0, 1), -- Grupo D: Turquía 0 - 1 Paraguay
    ('20260000-0000-0000-0000-000000000432'::uuid, 2, 0)  -- Grupo D: Estados Unidos 2 - 0 Australia
)
update public.matches m
set
  home_score = r.home_score,
  away_score = r.away_score,
  status = 'FINISHED'
from results r
where m.id = r.match_id;

-- Total esperado: 32 partidos finalizados (24 de Jornada 1 + 8 de Jornada 2).

commit;
