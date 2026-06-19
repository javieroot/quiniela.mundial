alter table public.settings
  add column if not exists results_api_enabled boolean not null default false,
  add column if not exists results_api_provider text,
  add column if not exists results_api_base_url text,
  add column if not exists special_results_api_enabled boolean not null default false,
  add column if not exists special_results_api_provider text;

alter table public.special_predictions
  add column if not exists best_player_id uuid references public.players(id),
  add column if not exists best_goalkeeper_id uuid references public.players(id);

alter table public.special_results
  add column if not exists best_player_id uuid references public.players(id),
  add column if not exists best_goalkeeper_id uuid references public.players(id);

create table if not exists public.api_sync_logs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  sync_type text not null default 'results',
  source text not null default 'api',
  provider text,
  status text not null,
  message text,
  records_checked integer not null default 0,
  records_changed integer not null default 0,
  error_message text,
  actor_id uuid references public.profiles(id),
  raw_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_sync_logs_tournament_created_idx
  on public.api_sync_logs(tournament_id, created_at desc);

alter table public.api_sync_logs enable row level security;

drop policy if exists "Admins can read api sync logs" on public.api_sync_logs;
create policy "Admins can read api sync logs"
  on public.api_sync_logs
  for select
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can insert api sync logs" on public.api_sync_logs;
create policy "Admins can insert api sync logs"
  on public.api_sync_logs
  for insert
  with check (public.is_admin(auth.uid()));

comment on table public.api_sync_logs is
  'Bitácora operativa de sincronizaciones automáticas/manuales de resultados y especiales.';

comment on column public.settings.results_api_provider is
  'Proveedor configurado para sincronizar resultados de partidos. Ejemplo: thesportsdb.';

comment on column public.settings.results_api_base_url is
  'Para TheSportsDB, guardar idLeague; para modo avanzado, URL JSON compatible.';

comment on column public.special_predictions.best_player_id is
  'Especial temporal: mejor jugador del torneo.';

comment on column public.special_predictions.best_goalkeeper_id is
  'Especial temporal: mejor portero del torneo.';

comment on column public.special_results.best_player_id is
  'Resultado oficial del especial temporal: mejor jugador del torneo.';

comment on column public.special_results.best_goalkeeper_id is
  'Resultado oficial del especial temporal: mejor portero del torneo.';
