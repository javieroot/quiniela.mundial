-- Localiza a español de México la información importada que ve el usuario final.
-- No modifica nombres de jugadores: se conservan como nombres propios.

begin;

with team_names(code, name) as (
  values
    ('MEX', 'México'),
    ('RSA', 'Sudáfrica'),
    ('KOR', 'Corea del Sur'),
    ('CZE', 'Chequia'),
    ('CAN', 'Canadá'),
    ('BIH', 'Bosnia y Herzegovina'),
    ('QAT', 'Catar'),
    ('SUI', 'Suiza'),
    ('BRA', 'Brasil'),
    ('MAR', 'Marruecos'),
    ('HAI', 'Haití'),
    ('SCO', 'Escocia'),
    ('USA', 'Estados Unidos'),
    ('PAR', 'Paraguay'),
    ('AUS', 'Australia'),
    ('TUR', 'Turquía'),
    ('CIV', 'Costa de Marfil'),
    ('ECU', 'Ecuador'),
    ('GER', 'Alemania'),
    ('CUW', 'Curazao'),
    ('NED', 'Países Bajos'),
    ('JPN', 'Japón'),
    ('SWE', 'Suecia'),
    ('TUN', 'Túnez'),
    ('IRN', 'Irán'),
    ('NZL', 'Nueva Zelanda'),
    ('BEL', 'Bélgica'),
    ('EGY', 'Egipto'),
    ('KSA', 'Arabia Saudita'),
    ('URU', 'Uruguay'),
    ('ESP', 'España'),
    ('CPV', 'Cabo Verde'),
    ('FRA', 'Francia'),
    ('SEN', 'Senegal'),
    ('IRQ', 'Irak'),
    ('NOR', 'Noruega'),
    ('ARG', 'Argentina'),
    ('ALG', 'Argelia'),
    ('AUT', 'Austria'),
    ('JOR', 'Jordania'),
    ('POR', 'Portugal'),
    ('COD', 'RD Congo'),
    ('UZB', 'Uzbekistán'),
    ('COL', 'Colombia'),
    ('GHA', 'Ghana'),
    ('PAN', 'Panamá'),
    ('ENG', 'Inglaterra'),
    ('CRO', 'Croacia')
)
update public.teams t
set name = team_names.name
from team_names
where t.code = team_names.code
  and t.tournament_id = '20260000-0000-0000-0000-000000000001';

with stadium_names(original, localized) as (
  values
    ('Mexico City Stadium', 'Estadio Ciudad de México'),
    ('Estadio Guadalajara', 'Estadio de Guadalajara'),
    ('Toronto Stadium', 'Estadio de Toronto'),
    ('Los Angeles Stadium', 'Estadio de Los Ángeles'),
    ('San Francisco Bay Area Stadium', 'Estadio del Área de la Bahía de San Francisco'),
    ('Boston Stadium', 'Estadio de Boston'),
    ('New York New Jersey Stadium', 'Estadio Nueva York/Nueva Jersey'),
    ('Vancouver Stadium', 'Estadio de Vancouver'),
    ('Philadelphia Stadium', 'Estadio de Filadelfia'),
    ('Houston Stadium', 'Estadio de Houston'),
    ('Dallas Stadium', 'Estadio de Dallas'),
    ('Monterrey Stadium', 'Estadio de Monterrey'),
    ('Seattle Stadium', 'Estadio de Seattle'),
    ('Miami Stadium', 'Estadio de Miami'),
    ('Atlanta Stadium', 'Estadio de Atlanta'),
    ('Kansas City Stadium', 'Estadio de Kansas City')
)
update public.matches m
set stadium = stadium_names.localized
from stadium_names
where m.stadium = stadium_names.original
  and m.tournament_id = '20260000-0000-0000-0000-000000000001';

with city_names(original, localized) as (
  values
    ('Mexico City', 'Ciudad de México'),
    ('Los Angeles', 'Los Ángeles'),
    ('San Francisco Bay Area', 'Área de la Bahía de San Francisco'),
    ('New York New Jersey', 'Nueva York/Nueva Jersey'),
    ('Philadelphia', 'Filadelfia')
)
update public.matches m
set city = city_names.localized
from city_names
where m.city = city_names.original
  and m.tournament_id = '20260000-0000-0000-0000-000000000001';

commit;

-- Validación sugerida después de ejecutar:
-- select code, name from public.teams where tournament_id = '20260000-0000-0000-0000-000000000001' order by code;
-- select distinct stadium, city from public.matches where tournament_id = '20260000-0000-0000-0000-000000000001' order by stadium, city;
