-- Pronostix v2 - importar pronósticos de un usuario desde JSON
-- Uso:
-- 1) Si el usuario cambia, primero busca sus datos con:
--    select id, username, display_name
--    from public.profiles
--    where lower(username) like '%texto%'
--       or lower(display_name) like '%texto%'
--    order by display_name, username;
-- 2) Reemplaza el contenido de la variable payload.data por el JSON devuelto.
-- 3) El JSON debe traer user.id o user.username y predictions[].match_id/home_score/away_score.
-- 4) Ejecuta este script en Supabase SQL Editor o psql.
--
-- Notas:
-- - Ignora filas sin marcador completo (home_score o away_score null).
-- - Actualiza pronósticos existentes por unique(user_id, match_id).
-- - No altera resultados oficiales ni especiales.

begin;

with payload(data) as (
  values (
    $$
    {
      "tournament_id": "20260000-0000-0000-0000-000000000001",
      "tournament": "world_cup_2026",
      "user": {
        "id": "49344ade-d884-4fa8-9bf4-93a2b15ae650",
        "username": "javieroot",
        "display_name": "Javier Nieto"
      },
      "predictions": []
    }
    $$::jsonb
  )
),
target_user as (
  select coalesce(
    nullif(data #>> '{user,id}', '')::uuid,
    (
      select p.id
      from public.profiles p
      where lower(p.username) = lower(nullif(data #>> '{user,username}', ''))
         or lower(p.display_name) = lower(nullif(data #>> '{user,display_name}', ''))
      order by case when lower(p.username) = lower(nullif(data #>> '{user,username}', '')) then 0 else 1 end
      limit 1
    )
  ) as user_id
  from payload
),
json_predictions as (
  select
    nullif(p.match_id, '')::uuid as match_id,
    p.home_score::int as home_score,
    p.away_score::int as away_score
  from payload
  cross join jsonb_to_recordset(payload.data->'predictions') as p(
    match_id text,
    home_score int,
    away_score int
  )
  where p.home_score is not null
    and p.away_score is not null
),
valid_predictions as (
  select jp.match_id, jp.home_score, jp.away_score
  from json_predictions jp
  join public.matches m on m.id = jp.match_id
  join payload on true
  where m.tournament_id = (payload.data->>'tournament_id')::uuid
)
insert into public.predictions(user_id, match_id, home_score, away_score, updated_at)
select
  tu.user_id,
  vp.match_id,
  vp.home_score,
  vp.away_score,
  now()
from target_user tu
cross join valid_predictions vp
where tu.user_id is not null
on conflict (user_id, match_id) do update set
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  updated_at = excluded.updated_at;

commit;

-- Validaciones recomendadas después del import:
-- 1) Confirmar usuario exacto:
-- select id, username, display_name from public.profiles
-- where lower(username) like '%javier%' or lower(display_name) like '%javier%';
--
-- 2) Contar pronósticos importados para el usuario:
-- select count(*)
-- from public.predictions pr
-- where pr.user_id = '49344ade-d884-4fa8-9bf4-93a2b15ae650';
--
-- 3) Ver última actualización de sus pronósticos:
-- select max(updated_at) as ultima_actualizacion
-- from public.predictions
-- where user_id = '49344ade-d884-4fa8-9bf4-93a2b15ae650';
