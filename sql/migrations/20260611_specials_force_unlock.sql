-- Permite desbloqueo manual controlado de especiales desde Administración.
-- Default false conserva el bloqueo automático al iniciar el primer partido.

alter table public.settings
  add column if not exists specials_force_unlock boolean not null default false;

comment on column public.settings.specials_force_unlock is 'Cuando true, permite editar especiales aunque el torneo ya haya iniciado. Uso excepcional desde Administración.';
