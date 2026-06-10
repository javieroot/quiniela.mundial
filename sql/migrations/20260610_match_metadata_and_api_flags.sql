-- Migración mínima compatible para Pronostix v2 existente.
-- Agrega metadata visible de partidos y banderas de preparación para APIs futuras.
-- Es segura para correr más de una vez porque usa IF NOT EXISTS.

alter table public.matches
  add column if not exists group_name text,
  add column if not exists stadium text,
  add column if not exists city text;

alter table public.settings
  add column if not exists results_api_enabled boolean not null default false,
  add column if not exists results_api_provider text,
  add column if not exists results_api_base_url text,
  add column if not exists special_results_api_enabled boolean not null default false,
  add column if not exists special_results_api_provider text;

comment on column public.matches.group_name is 'Grupo/fase visible del partido, por ejemplo A, B, Octavos.';
comment on column public.matches.stadium is 'Estadio sede del partido.';
comment on column public.matches.city is 'Ciudad sede del partido.';

comment on column public.settings.results_api_enabled is 'Bandera futura para habilitar importación automática de resultados de partidos.';
comment on column public.settings.results_api_provider is 'Nombre del proveedor/API futura de resultados de partidos.';
comment on column public.settings.results_api_base_url is 'URL base opcional de API futura de resultados.';

comment on column public.settings.special_results_api_enabled is 'Bandera futura para automatizar resultados especiales.';
comment on column public.settings.special_results_api_provider is 'Proveedor/API futura para resultados especiales.';
