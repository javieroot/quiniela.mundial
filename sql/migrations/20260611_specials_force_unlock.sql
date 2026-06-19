alter table public.settings
  add column if not exists specials_force_unlock boolean not null default false;

comment on column public.settings.specials_force_unlock is
  'Permite desbloquear manualmente la captura de especiales aunque el torneo ya haya iniciado. Usar solo en casos excepcionales.';

update public.settings
set specials_force_unlock = false
where specials_force_unlock is null;
