alter table public.players
  add column if not exists position text not null default 'FIELD',
  add column if not exists is_special_candidate boolean not null default true;

alter table public.players
  drop constraint if exists players_position_check;

alter table public.players
  add constraint players_position_check check (position in ('GK','FIELD'));

comment on column public.players.position is
  'Clasificación operativa para especiales: GK portero, FIELD jugador de campo.';

comment on column public.players.is_special_candidate is
  'Indica si el jugador debe aparecer en los autocompletados de especiales.';
