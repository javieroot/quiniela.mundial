create extension if not exists pgcrypto;

create type public.payment_status as enum ('UNPAID','PAID');
create type public.match_status as enum ('SCHEDULED','FINISHED');

create table public.tournaments(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tournaments_one_active_idx on public.tournaments(is_active) where is_active;

create table public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check(username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null,
  payment_status public.payment_status not null default 'UNPAID',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams(
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  code text not null,
  unique(tournament_id,name),
  unique(tournament_id,code)
);

create table public.players(
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid references public.teams(id),
  name text not null,
  unique(tournament_id,name)
);

create table public.matches(
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  kickoff_at timestamptz not null,
  group_name text,
  stadium text,
  city text,
  home_score int check(home_score>=0),
  away_score int check(away_score>=0),
  status public.match_status not null default 'SCHEDULED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(home_team_id<>away_team_id)
);
create index matches_tournament_kickoff_idx on public.matches(tournament_id,kickoff_at);

create table public.settings(
  id int primary key default 1 check(id=1),
  entry_fee numeric(12,2) not null default 200,
  admin_percentage numeric(5,2) not null default 10,
  first_place_percentage numeric(5,2) not null default 50,
  second_place_percentage numeric(5,2) not null default 25,
  third_place_percentage numeric(5,2) not null default 15,
  lock_minutes_before_match int not null default 1,
  results_api_enabled boolean not null default false,
  results_api_provider text,
  results_api_base_url text,
  special_results_api_enabled boolean not null default false,
  special_results_api_provider text,
  specials_force_unlock boolean not null default false,
  updated_at timestamptz not null default now(),
  check(admin_percentage between 0 and 100),
  check(admin_percentage + first_place_percentage + second_place_percentage + third_place_percentage = 100)
);

create table public.predictions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score int not null check(home_score>=0),
  away_score int not null check(away_score>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,match_id)
);

create table public.special_predictions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  champion_team_id uuid references public.teams(id),
  runner_up_team_id uuid references public.teams(id),
  third_place_team_id uuid references public.teams(id),
  top_scorer_player_id uuid references public.players(id),
  best_player_id uuid references public.players(id),
  best_goalkeeper_id uuid references public.players(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,tournament_id),
  check(champion_team_id is null or runner_up_team_id is null or champion_team_id<>runner_up_team_id),
  check(champion_team_id is null or third_place_team_id is null or champion_team_id<>third_place_team_id),
  check(runner_up_team_id is null or third_place_team_id is null or runner_up_team_id<>third_place_team_id)
);

create table public.special_results(
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  champion_team_id uuid references public.teams(id),
  runner_up_team_id uuid references public.teams(id),
  third_place_team_id uuid references public.teams(id),
  top_scorer_player_id uuid references public.players(id),
  best_player_id uuid references public.players(id),
  best_goalkeeper_id uuid references public.players(id),
  updated_at timestamptz not null default now()
);

create table public.api_sync_logs(
  id bigint generated always as identity primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  sync_type text not null default 'results',
  source text not null default 'api',
  provider text,
  status text not null,
  message text,
  records_checked int not null default 0,
  records_changed int not null default 0,
  error_message text,
  actor_id uuid references public.profiles(id),
  raw_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (sync_type in ('results','special_results')),
  check (source in ('api','manual')),
  check (status in ('OK','PARTIAL','ERROR','MANUAL')),
  check (records_checked >= 0),
  check (records_changed >= 0)
);
create index api_sync_logs_tournament_created_idx on public.api_sync_logs(tournament_id, created_at desc);
create index api_sync_logs_status_idx on public.api_sync_logs(status);

create table public.audit_logs(
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  table_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

create trigger touch_tournaments before update on public.tournaments for each row execute function public.touch_updated_at();
create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_matches before update on public.matches for each row execute function public.touch_updated_at();
create trigger touch_settings before update on public.settings for each row execute function public.touch_updated_at();
create trigger touch_predictions before update on public.predictions for each row execute function public.touch_updated_at();
create trigger touch_special_predictions before update on public.special_predictions for each row execute function public.touch_updated_at();
create trigger touch_special_results before update on public.special_results for each row execute function public.touch_updated_at();

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=uid and is_admin)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username,display_name)
  values(
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''),'user_'||substr(new.id::text,1,8)),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1))
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.assert_prediction_open()
returns trigger language plpgsql security definer set search_path=public as $$
declare k timestamptz; mins int;
begin
  if public.is_admin(auth.uid()) then return new; end if;
  select kickoff_at into k from public.matches where id=new.match_id;
  select lock_minutes_before_match into mins from public.settings where id=1;
  if now() >= k - make_interval(mins=>coalesce(mins,1)) then
    raise exception 'Pronóstico bloqueado';
  end if;
  return new;
end $$;
create trigger predictions_lock before insert or update on public.predictions for each row execute function public.assert_prediction_open();

create or replace function public.assert_specials_open()
returns trigger language plpgsql security definer set search_path=public as $$
declare k timestamptz; force_unlock boolean;
begin
  if public.is_admin(auth.uid()) then return new; end if;
  select coalesce(specials_force_unlock,false) into force_unlock from public.settings where id=1;
  if force_unlock then return new; end if;
  select min(kickoff_at) into k from public.matches where tournament_id=new.tournament_id;
  if k is null then select starts_at into k from public.tournaments where id=new.tournament_id; end if;
  if now() >= k then raise exception 'Especiales bloqueados'; end if;
  return new;
end $$;
create trigger special_predictions_lock before insert or update on public.special_predictions for each row execute function public.assert_specials_open();

alter table public.tournaments enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.settings enable row level security;
alter table public.predictions enable row level security;
alter table public.special_predictions enable row level security;
alter table public.special_results enable row level security;
alter table public.api_sync_logs enable row level security;
alter table public.audit_logs enable row level security;

create policy "read tournaments" on public.tournaments for select to authenticated using(true);
create policy "admin tournaments" on public.tournaments for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "read profiles" on public.profiles for select to authenticated using(true);
create policy "admin profiles" on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "read teams" on public.teams for select to authenticated using(true);
create policy "admin teams" on public.teams for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "read players" on public.players for select to authenticated using(true);
create policy "admin players" on public.players for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "read matches" on public.matches for select to authenticated using(true);
create policy "admin matches" on public.matches for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "read settings" on public.settings for select to authenticated using(true);
create policy "admin settings" on public.settings for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "read predictions" on public.predictions for select to authenticated using(true);
create policy "own predictions insert" on public.predictions for insert to authenticated with check(user_id=auth.uid());
create policy "own predictions update" on public.predictions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "admin predictions" on public.predictions for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "read special predictions" on public.special_predictions for select to authenticated using(true);
create policy "own special insert" on public.special_predictions for insert to authenticated with check(user_id=auth.uid());
create policy "own special update" on public.special_predictions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "admin special predictions" on public.special_predictions for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "read special results" on public.special_results for select to authenticated using(true);
create policy "admin special results" on public.special_results for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admin read api sync logs" on public.api_sync_logs for select to authenticated using(public.is_admin());
create policy "admin insert api sync logs" on public.api_sync_logs for insert to authenticated with check(public.is_admin());

insert into public.settings(id,entry_fee,admin_percentage,first_place_percentage,second_place_percentage,third_place_percentage,lock_minutes_before_match)
values(1,200,10,50,25,15,1);

do $$
declare
  tid uuid := '00000000-0000-0000-0000-000000000101';
  admin_id uuid := '00000000-0000-0000-0000-000000000001';
  a_id uuid := '00000000-0000-0000-0000-000000000002';
  b_id uuid := '00000000-0000-0000-0000-000000000003';
  c_id uuid := '00000000-0000-0000-0000-000000000004';
  d_id uuid := '00000000-0000-0000-0000-000000000005';
  e_id uuid := '00000000-0000-0000-0000-000000000006';
  mex uuid := '00000000-0000-0000-0000-000000000201';
  arg uuid := '00000000-0000-0000-0000-000000000202';
  bra uuid := '00000000-0000-0000-0000-000000000203';
  fra uuid := '00000000-0000-0000-0000-000000000204';
  ger uuid := '00000000-0000-0000-0000-000000000205';
  esp uuid := '00000000-0000-0000-0000-000000000206';
  scorer uuid := '00000000-0000-0000-0000-000000000301';
  p2 uuid := '00000000-0000-0000-0000-000000000302';
  p3 uuid := '00000000-0000-0000-0000-000000000303';
  m1 uuid := '00000000-0000-0000-0000-000000000401';
  m2 uuid := '00000000-0000-0000-0000-000000000402';
  m3 uuid := '00000000-0000-0000-0000-000000000403';
  m4 uuid := '00000000-0000-0000-0000-000000000404';
  m5 uuid := '00000000-0000-0000-0000-000000000405';
  pwd text := crypt('Pronostix2026!', gen_salt('bf'));
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_user_meta_data,created_at,updated_at) values
  ('00000000-0000-0000-0000-000000000000',admin_id,'authenticated','authenticated','admin@pronostix.test',pwd,now(),'{"username":"admin","display_name":"Admin Pagado"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',a_id,'authenticated','authenticated','pagado.a@pronostix.test',pwd,now(),'{"username":"pagado_a","display_name":"Usuario Pagado A"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',b_id,'authenticated','authenticated','pagado.b@pronostix.test',pwd,now(),'{"username":"pagado_b","display_name":"Usuario Pagado B"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',c_id,'authenticated','authenticated','nopagado.c@pronostix.test',pwd,now(),'{"username":"nopagado_c","display_name":"Usuario No Pagado C"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',d_id,'authenticated','authenticated','empatado.d@pronostix.test',pwd,now(),'{"username":"empatado_d","display_name":"Usuario Empatado D"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',e_id,'authenticated','authenticated','sin.e@pronostix.test',pwd,now(),'{"username":"sin_e","display_name":"Usuario Sin Pronósticos E"}',now(),now())
  on conflict(id) do nothing;

  update public.profiles set payment_status='PAID', is_admin=true where id=admin_id;
  update public.profiles set payment_status='PAID' where id in(a_id,b_id,d_id);

  insert into public.tournaments(id,name,starts_at,is_active) values(tid,'Mundial Dummy 2026',now()-interval '7 days',true);
  insert into public.teams(id,tournament_id,name,code) values
  (mex,tid,'México','MEX'),(arg,tid,'Argentina','ARG'),(bra,tid,'Brasil','BRA'),(fra,tid,'Francia','FRA'),(ger,tid,'Alemania','GER'),(esp,tid,'España','ESP');
  insert into public.players(id,tournament_id,team_id,name) values
  (scorer,tid,mex,'Santiago Giménez'),(p2,tid,arg,'Lionel Messi'),(p3,tid,fra,'Kylian Mbappé');
  insert into public.matches(id,tournament_id,home_team_id,away_team_id,kickoff_at,group_name,stadium,city,home_score,away_score,status) values
  (m1,tid,mex,arg,now()-interval '5 days','Grupo A','Estadio Azteca','Ciudad de México',2,1,'FINISHED'),
  (m2,tid,bra,fra,now()-interval '4 days','Grupo B','MetLife Stadium','Nueva York/Nueva Jersey',0,0,'FINISHED'),
  (m3,tid,ger,esp,now()-interval '3 days','Grupo C','SoFi Stadium','Los Ángeles',1,3,'FINISHED'),
  (m4,tid,mex,bra,now()+interval '30 seconds','Grupo A','Estadio Akron','Guadalajara',null,null,'SCHEDULED'),
  (m5,tid,arg,esp,now()+interval '2 hours','Grupo D','AT&T Stadium','Dallas',null,null,'SCHEDULED');

  alter table public.predictions disable trigger predictions_lock;
  insert into public.predictions(user_id,match_id,home_score,away_score,updated_at) values
  (admin_id,m1,2,1,'2026-01-01 10:00+00'),(admin_id,m2,1,1,'2026-01-01 10:00+00'),(admin_id,m3,0,2,'2026-01-01 10:00+00'),
  (a_id,m1,2,1,'2026-01-04 10:00+00'),(a_id,m2,0,0,'2026-01-04 10:00+00'),(a_id,m3,1,2,'2026-01-04 10:00+00'),
  (b_id,m1,1,2,'2026-01-05 10:00+00'),(b_id,m2,0,1,'2026-01-05 10:00+00'),(b_id,m3,1,3,'2026-01-05 10:00+00'),
  (c_id,m1,2,1,'2026-01-01 10:00+00'),(c_id,m2,2,2,'2026-01-01 10:00+00'),(c_id,m3,2,3,'2026-01-01 10:00+00'),
  (d_id,m1,2,1,'2026-01-03 10:00+00'),(d_id,m2,0,0,'2026-01-03 10:00+00'),(d_id,m3,0,1,'2026-01-03 10:00+00');
  alter table public.predictions enable trigger predictions_lock;

  alter table public.special_predictions disable trigger special_predictions_lock;
  insert into public.special_predictions(user_id,tournament_id,champion_team_id,runner_up_team_id,third_place_team_id,top_scorer_player_id,updated_at) values
  (admin_id,tid,mex,arg,bra,scorer,'2026-01-01 10:00+00'),
  (a_id,tid,mex,fra,bra,p2,'2026-01-04 10:00+00'),
  (b_id,tid,esp,fra,ger,p2,'2026-01-05 10:00+00'),
  (c_id,tid,mex,arg,bra,scorer,'2026-01-01 10:00+00'),
  (d_id,tid,mex,fra,bra,p2,'2026-01-03 10:00+00');
  alter table public.special_predictions enable trigger special_predictions_lock;

  insert into public.special_results(tournament_id,champion_team_id,runner_up_team_id,third_place_team_id,top_scorer_player_id)
  values(tid,mex,arg,bra,scorer);
end $$;
