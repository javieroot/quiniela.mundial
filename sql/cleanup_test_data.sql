-- Pronostix v2 - limpieza segura de datos de prueba
-- Borra usuarios dummy, pronósticos dummy, especiales dummy, resultados dummy, pagos dummy y auditoría dummy.
-- Conserva estructura, settings, torneo, equipos, jugadores y partidos base.

begin;

-- Usuarios dummy documentados en schema/README históricos.
with dummy_users(id) as (
  values
  ('00000000-0000-0000-0000-000000000001'::uuid),
  ('00000000-0000-0000-0000-000000000002'::uuid),
  ('00000000-0000-0000-0000-000000000003'::uuid),
  ('00000000-0000-0000-0000-000000000004'::uuid),
  ('00000000-0000-0000-0000-000000000005'::uuid),
  ('00000000-0000-0000-0000-000000000006'::uuid)
)
delete from public.predictions p using dummy_users d where p.user_id = d.id;

with dummy_users(id) as (
  values
  ('00000000-0000-0000-0000-000000000001'::uuid),
  ('00000000-0000-0000-0000-000000000002'::uuid),
  ('00000000-0000-0000-0000-000000000003'::uuid),
  ('00000000-0000-0000-0000-000000000004'::uuid),
  ('00000000-0000-0000-0000-000000000005'::uuid),
  ('00000000-0000-0000-0000-000000000006'::uuid)
)
delete from public.special_predictions sp using dummy_users d where sp.user_id = d.id;

-- No se borran special_results de producción. Si cargaste resultados especiales dummy, bórralos manualmente después de confirmar el torneo afectado.

with dummy_users(id) as (
  values
  ('00000000-0000-0000-0000-000000000001'::uuid),
  ('00000000-0000-0000-0000-000000000002'::uuid),
  ('00000000-0000-0000-0000-000000000003'::uuid),
  ('00000000-0000-0000-0000-000000000004'::uuid),
  ('00000000-0000-0000-0000-000000000005'::uuid),
  ('00000000-0000-0000-0000-000000000006'::uuid)
)
delete from public.audit_logs a using dummy_users d where a.actor_id = d.id;

delete from auth.users
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006'
);

-- No se borran ni modifican partidos, equipos, torneo ni settings.

commit;
