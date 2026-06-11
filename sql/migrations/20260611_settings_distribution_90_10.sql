begin;

alter table public.settings
  drop constraint if exists settings_check;

alter table public.settings
  drop constraint if exists settings_distribution_total_check;

insert into public.settings(
  id,
  entry_fee,
  admin_percentage,
  first_place_percentage,
  second_place_percentage,
  third_place_percentage,
  lock_minutes_before_match,
  results_api_enabled,
  special_results_api_enabled
)
values (1, 200, 10, 50, 25, 15, 1, false, false)
on conflict (id) do update set
  entry_fee = excluded.entry_fee,
  admin_percentage = excluded.admin_percentage,
  first_place_percentage = excluded.first_place_percentage,
  second_place_percentage = excluded.second_place_percentage,
  third_place_percentage = excluded.third_place_percentage,
  lock_minutes_before_match = excluded.lock_minutes_before_match,
  results_api_enabled = excluded.results_api_enabled,
  special_results_api_enabled = excluded.special_results_api_enabled;

alter table public.settings
  add constraint settings_distribution_total_check
  check (admin_percentage + first_place_percentage + second_place_percentage + third_place_percentage = 100);

commit;
