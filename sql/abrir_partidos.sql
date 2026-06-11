select id,
       home_team_id,
       away_team_id,
       kickoff_at
from matches
order by kickoff_at
limit 5;

-- 2026-06-11 19:00:00+00

update matches
set kickoff_at = now() + interval '2 hours'
where id = '20260000-0000-0000-0000-000000000401';



update matches
set kickoff_at = '2026-06-11 19:00:00+00'
where id = '20260000-0000-0000-0000-000000000401';
