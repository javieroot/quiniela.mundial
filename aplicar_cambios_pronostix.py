from pathlib import Path

ROOT = Path.cwd()


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print(f"OK {path}")


def replace(path, old, new):
    text = read(path)
    if new in text:
        print(f"YA estaba: {path}")
        return
    if old not in text:
        print(f"AVISO: no encontré texto exacto en {path}. Puede que ya esté cambiado.")
        return
    write(path, text.replace(old, new))


def append_once(path, marker, chunk):
    text = read(path)
    if marker in text:
        print(f"YA estaba: {path}")
        return
    write(path, text.rstrip() + "\n" + chunk.strip() + "\n")


# ============================================================
# README.md
# ============================================================

replace(
    "README.md",
    "Limpia usuarios/pronósticos/resultados dummy, pero conserva estructura, settings, torneo, equipos, jugadores y partidos base.",
    "Limpia usuarios dummy conocidos, sus pronósticos/especiales y auditoría asociada, pero conserva estructura, settings, torneo, equipos, jugadores y partidos base. Los resultados de prueba se limpian con las RPC de mantenimiento (`reset_tournament_results()` o `reset_full_test()`).\n\n### `validate_pre_production_clean.sql`\n\nVerifica antes de liberar que no queden usuarios dummy conocidos, capturas, resultados de prueba ni configuración económica distinta a 200 MXN, 10% admin y premios 50%/25%/15%."
)

replace(
    "README.md",
    "- Desempates: total, especiales, exactos, resultados acertados y última modificación más antigua.\n- Empates comparten posición y premio.",
    "- Desempates: puntos totales, puntos especiales y última modificación más antigua.\n- No hay desempate alfabético; los empates comparten posición densa y premio."
)

replace(
    "README.md",
    "- Reemplazar placeholders de `seed_base_data.sql` con datos reales confirmados.",
    "- Confirmar configuración: inscripción 200 MXN, admin 10%, premios 50%/25%/15% y bloqueo 1 minuto antes del partido.\n- Ejecutar `cleanup_test_data.sql` si existieron usuarios dummy conocidos.\n- Ejecutar `validate_pre_production_clean.sql` y resolver cualquier fila en `REVISAR`."
)


# ============================================================
# css/styles.css
# ============================================================

append_once(
    "css/styles.css",
    "Admin maintenance and role-management polish",
    """
/* Admin maintenance and role-management polish */
.maintenance-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.maintenance-status{border:1px solid var(--line);border-radius:18px;padding:14px;background:#f8fafc}.maintenance-status span{display:block;color:#475569;font-weight:900;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em}.maintenance-status b{display:block;font-size:1.65rem;font-weight:950;margin:.15rem 0}.maintenance-status small{display:block;color:#475569;font-weight:750}.maintenance-status.ok{background:#f0fdf4;border-color:#bbf7d0}.maintenance-status.ok b{color:#15803d}.maintenance-status.danger{background:#fff7ed;border-color:#fed7aa}.maintenance-status.danger b{color:#c2410c}.admin-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.role-select{min-width:112px}.admin-users-table .input{min-width:120px}
@media (max-width:760px){.admin-actions{align-items:stretch;flex-direction:column}.admin-actions .btn,.role-select{width:100%}}
"""
)


# ============================================================
# docs/entrega-rapida.md - ARCHIVO NUEVO
# ============================================================

write("docs/entrega-rapida.md", """# Pronostix - entrega rápida de archivos

Esta es la lista corta para avanzar sin revisar todo el proyecto.

## 1. Archivos de la app

Sube estos archivos a GitHub Pages:

- `index.html`
- `config.js`
- `css/styles.css`
- carpeta completa `js/`

## 2. Archivos SQL para Supabase

Ejecuta en Supabase SQL Editor en este orden:

1. `sql/schema.sql` si la base es nueva.
2. `sql/migrations/20260610_match_metadata_and_api_flags.sql` si la base ya existía.
3. `sql/migrations/20260610_roles_and_admin_maintenance.sql` para ROOT/ADMIN y mantenimiento.
4. `sql/migrations/20260611_settings_distribution_90_10.sql` para corregir distribución 90/10.
5. `sql/seed_base_data.sql` para dejar inscripción 200 MXN, premios 50/25/15 y admin 10%.
6. `sql/seed_worldcup_2026.sql` para calendario/equipos.
7. `sql/seed_worldcup_2026_players_candidates.sql` para goleadores.
8. `sql/validate_worldcup_2026_seed.sql` para validar carga base.

## 3. Limpieza antes de producción

Si hubo datos de prueba:

1. Ejecuta `sql/cleanup_test_data.sql` para quitar usuarios dummy conocidos.
2. Entra como ADMIN/ROOT al panel y usa Mantenimiento:
   - Limpiar capturas de usuarios.
   - Limpiar resultados del torneo.
   - O Reiniciar prueba completa.
3. Ejecuta `sql/validate_pre_production_clean.sql`.
4. Todo debe salir `OK`. Si aparece `REVISAR`, corrige antes de liberar.

## 4. Checklist rápida

- ROOT puede entrar al panel.
- ADMIN puede operar pagos/resultados.
- General muestra todos los usuarios.
- Oficial muestra solo PAGADO.
- Especiales no permiten repetir equipos.
- Premios: 50%, 25%, 15% del total; admin: 10%.
- Admin: 10% no visible para usuario.
- Inscripción: 200 MXN.
- Bloqueo: 1 minuto antes del partido.
- Todo visible en español.

## 5. Si solo quieres probar ya

1. Configura `config.js` con URL y anon key de Supabase.
2. Abre `index.html` en GitHub Pages.
3. Crea/usa usuario ROOT.
4. Revisa el panel de Administración.
5. Ejecuta `validate_pre_production_clean.sql` antes de producción.
""")


# ============================================================
# index.html
# ============================================================

replace("index.html", "20260610-final5", "20260611-maintenance-ux")


# ============================================================
# js/admin.js
# ============================================================

admin = read("js/admin.js")

if "const DUMMY_USER_IDS" not in admin:
    admin = admin.replace(
        '  const Rankings = window.PronostixRankings;\n',
        '''  const Rankings = window.PronostixRankings;
  const DUMMY_USER_IDS = [
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000003",
    "00000000-0000-0000-0000-000000000004",
    "00000000-0000-0000-0000-000000000005",
    "00000000-0000-0000-0000-000000000006"
  ];

  const isRoot = () => P.state.profile?.role === "ROOT";
'''
    )

admin = admin.replace(
    '''    const [{ data: users, error: usersError }, tournamentData, officialRows] = await Promise.all([
      P.sb.from("profiles").select("*").order("created_at"),
      Data.getTournamentData(),
      Rankings.calculateRows(true)
    ]);''',
    '''    const [{ data: users, error: usersError }, tournamentData, officialRows, maintenanceSnapshot] = await Promise.all([
      P.sb.from("profiles").select("*").order("created_at"),
      Data.getTournamentData(),
      Rankings.calculateRows(true),
      getMaintenanceSnapshot()
    ]);'''
)

admin = admin.replace("${renderMaintenance()}", "${renderMaintenance(maintenanceSnapshot)}")

admin = admin.replace(
    "Premios 1°+2°+3° deben sumar 100. Comisión admin debe estar entre 0 y 100.",
    "Premios 1°+2°+3° + comisión admin deben sumar 100."
)

old_users = '''  function userRole(user) {
    if (user.role) return user.role;
    return user.is_admin ? "ADMIN" : "USER";
  }

  function renderUsers(users) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Usuarios y pagos</h3><div class="table-wrap mt-3"><table class="data-table"><thead><tr><th>Usuario</th><th>ID de usuario</th><th>Pago</th><th>Rol</th><th>Administrador</th><th>Acción</th></tr></thead><tbody>
      ${users.map(user => `<tr><td>${UI.userChip(user, true)}</td><td><small>${P.esc(user.id)}</small></td><td><select id="pay-${user.id}" class="input"><option value="UNPAID" ${user.payment_status === "UNPAID" ? "selected" : ""}>NO PAGADO</option><option value="PAID" ${user.payment_status === "PAID" ? "selected" : ""}>PAGADO</option></select></td><td><span class="pill">${P.esc(userRole(user))}</span></td><td>${user.is_admin ? "Sí" : "No"}</td><td><button class="btn btn-secondary" onclick="PronostixAdmin.savePayment('${user.id}')">Guardar</button></td></tr>`).join("")}
    </tbody></table></div></section>`;
  }'''

new_users = '''  function userRole(user) {
    if (user.role) return user.role;
    return user.is_admin ? "ADMIN" : "USER";
  }

  function roleControl(user) {
    const currentRole = userRole(user);
    if (!isRoot()) return `<span class="pill">${P.esc(currentRole)}</span>`;
    return `<div class="admin-actions"><select id="role-${user.id}" class="input role-select"><option value="USER" ${currentRole === "USER" ? "selected" : ""}>USER</option><option value="ADMIN" ${currentRole === "ADMIN" ? "selected" : ""}>ADMIN</option><option value="ROOT" ${currentRole === "ROOT" ? "selected" : ""}>ROOT</option></select><button class="btn btn-secondary" onclick="PronostixAdmin.saveRole('${user.id}')">Guardar rol</button></div>`;
  }

  function renderUsers(users) {
    return `<section class="card p-5"><div class="section-title"><div><h3>Usuarios, pagos y roles</h3><p>ROOT puede cambiar roles; ADMIN solo opera pagos y torneo. Los cambios sensibles se validan otra vez en SQL.</p></div></div><div class="table-wrap mt-3"><table class="data-table admin-users-table"><thead><tr><th>Usuario</th><th>ID de usuario</th><th>Pago</th><th>Rol</th><th>Administrador</th><th>Acciones</th></tr></thead><tbody>
      ${users.map(user => `<tr><td>${UI.userChip(user, true)}</td><td><small>${P.esc(user.id)}</small></td><td><select id="pay-${user.id}" class="input"><option value="UNPAID" ${user.payment_status === "UNPAID" ? "selected" : ""}>NO PAGADO</option><option value="PAID" ${user.payment_status === "PAID" ? "selected" : ""}>PAGADO</option></select></td><td>${roleControl(user)}</td><td>${user.is_admin ? "Sí" : "No"}</td><td><div class="admin-actions"><button class="btn btn-secondary" onclick="PronostixAdmin.savePayment('${user.id}')">Guardar pago</button></div></td></tr>`).join("")}
    </tbody></table></div></section>`;
  }'''

admin = admin.replace(old_users, new_users)

old_maintenance_start = '''  function renderMaintenance() {
    return `<section class="card p-5"><h3 class="text-xl font-black">Mantenimiento del torneo</h3>
      <p class="text-slate-600 mt-1">Herramientas seguras para pruebas y operación. Requieren ejecutar la migración <code>sql/migrations/20260610_roles_and_admin_maintenance.sql</code>.</p>
      <p class="text-sm text-slate-500 mt-2">Las limpiezas se validan en SQL con <code>auth.uid()</code> y rol ROOT/ADMIN. No dependen únicamente del botón del frontend.</p>
      <div class="grid md:grid-cols-3 gap-4 mt-3">'''

new_maintenance_start = '''  function statusCard(title, value, okText, dangerText) {
    const ok = value !== null && Number(value || 0) === 0;
    const copy = value === null ? "No se pudo verificar; revisa permisos/RLS." : (ok ? okText : dangerText);
    return `<article class="maintenance-status ${ok ? "ok" : "danger"}"><span>${P.esc(title)}</span><b>${value ?? "—"}</b><small>${P.esc(copy)}</small></article>`;
  }

  async function countRows(query) {
    const { count, error } = await query.select("id", { count: "exact", head: true });
    if (error) {
      P.toast(error.message, false);
      return null;
    }
    return count || 0;
  }

  async function getMaintenanceSnapshot() {
    const tid = P.state.activeTournament?.id;
    const [predictions, specialPredictions, specialResults, finishedMatches, scoredMatches, dummyProfiles] = await Promise.all([
      countRows(P.sb.from("predictions")),
      countRows(P.sb.from("special_predictions")),
      tid ? countRows(P.sb.from("special_results").eq("tournament_id", tid)) : 0,
      tid ? countRows(P.sb.from("matches").eq("tournament_id", tid).eq("status", "FINISHED")) : 0,
      tid ? countRows(P.sb.from("matches").eq("tournament_id", tid).not("home_score", "is", null).not("away_score", "is", null)) : 0,
      countRows(P.sb.from("profiles").in("id", DUMMY_USER_IDS))
    ]);
    const results = (specialResults || 0) + Math.max(finishedMatches || 0, scoredMatches || 0);
    return {
      predictions,
      specialPredictions,
      results,
      dummyProfiles,
      isClean: [predictions, specialPredictions, results, dummyProfiles].every(value => value !== null && Number(value || 0) === 0)
    };
  }

  function renderMaintenance(snapshot = {}) {
    return `<section class="card p-5"><div class="section-title"><div><h3>Mantenimiento del torneo</h3><p>Verificación previa y limpiezas seguras para cerrar pruebas antes de producción.</p></div><span class="pill ${snapshot.isClean ? "ok" : "danger"}">${snapshot.isClean ? "Listo para producción" : "Revisar datos"}</span></div>
      <p class="text-slate-600 mt-1">Herramientas seguras para pruebas y operación. Requieren ejecutar la migración <code>sql/migrations/20260610_roles_and_admin_maintenance.sql</code>.</p>
      <p class="text-sm text-slate-500 mt-2">Las limpiezas se validan en SQL con <code>auth.uid()</code> y rol ROOT/ADMIN. No dependen únicamente del botón del frontend.</p>
      <div class="maintenance-grid mt-3">
        ${statusCard("Usuarios dummy", snapshot.dummyProfiles, "Sin perfiles dummy conocidos.", "Hay perfiles dummy conocidos por borrar con cleanup_test_data.sql.")}
        ${statusCard("Pronósticos", snapshot.predictions, "Sin pronósticos cargados.", "Hay pronósticos cargados; confirma si son pruebas o producción.")}
        ${statusCard("Especiales usuarios", snapshot.specialPredictions, "Sin especiales de usuarios.", "Hay especiales de usuarios cargados; confirma si son pruebas o producción.")}
        ${statusCard("Resultados", snapshot.results, "Sin resultados capturados.", "Hay resultados capturados; confirma si son pruebas o producción.")}
      </div>
      <div class="grid md:grid-cols-3 gap-4 mt-3">'''

admin = admin.replace(old_maintenance_start, new_maintenance_start)

if "async function saveRole" not in admin:
    admin = admin.replace(
        '''  async function savePayment(id) {
    const { error } = await P.sb.from("profiles").update({ payment_status: P.val(`pay-${id}`) }).eq("id", id);
    P.toast(error ? error.message : "Pago actualizado.", !error);
  }

  async function saveMatchResult(id) {''',
        '''  async function savePayment(id) {
    const { error } = await P.sb.from("profiles").update({ payment_status: P.val(`pay-${id}`) }).eq("id", id);
    P.toast(error ? error.message : "Pago actualizado.", !error);
  }

  async function saveRole(id) {
    if (!isRoot()) return P.toast("Solo ROOT puede modificar roles.", false);
    const newRole = P.val(`role-${id}`);
    if (!newRole) return P.toast("Selecciona un rol.", false);
    if (window.prompt(`Escribe CAMBIAR ROL para asignar ${newRole}.`) !== "CAMBIAR ROL") return P.toast("Operación cancelada.", false);
    const { error } = await P.sb.rpc("set_profile_role", { target_profile_id: id, new_role: newRole });
    await Data.loadProfile();
    P.toast(error ? error.message : "Rol actualizado.", !error);
    if (!error) renderAdmin();
  }

  async function saveMatchResult(id) {'''
    )

admin = admin.replace(
    "savePayment, saveMatchResult",
    "savePayment, saveRole, saveMatchResult"
)

admin = admin.replace(
    '''    const prizeSum = payload.first_place_percentage + payload.second_place_percentage + payload.third_place_percentage;
    if (Math.abs(prizeSum - 100) > 0.001) return `Los porcentajes de premios deben sumar 100%. Actualmente suman ${prizeSum}%.`;''',
    '''    const totalDistribution = payload.admin_percentage + payload.first_place_percentage + payload.second_place_percentage + payload.third_place_percentage;
    if (Math.abs(totalDistribution - 100) > 0.001) return `Comisión admin + premios deben sumar 100%. Actualmente suman ${totalDistribution}%.`;'''
)

write("js/admin.js", admin)


# ============================================================
# js/rankings.js
# ============================================================

replace(
    "js/rankings.js",
    "      || (b.special_points - a.special_points)\n      || (b.exacts - a.exacts)\n      || (b.results - a.results)\n      || (new Date(a.last_modified) - new Date(b.last_modified));",
    "      || (b.special_points - a.special_points)\n      || (new Date(a.last_modified) - new Date(b.last_modified));"
)

replace(
    "js/rankings.js",
    "      const prize = netPool * percentages[place] / 100;",
    "      const prize = pool * percentages[place] / 100;"
)


# ============================================================
# js/rules.js
# ============================================================

replace(
    "js/rules.js",
    "Orden: puntos totales, puntos especiales, marcadores exactos, resultados acertados y última modificación más antigua. No se usa orden alfabético.",
    "Orden: puntos totales, puntos especiales y última modificación más antigua. No se usa orden alfabético."
)


# ============================================================
# sql/cleanup_test_data.sql
# ============================================================

replace(
    "sql/cleanup_test_data.sql",
    "-- Borra usuarios dummy, pronósticos dummy, especiales dummy, resultados dummy, pagos dummy y auditoría dummy.",
    "-- Borra usuarios dummy, sus pronósticos/especiales dummy, pagos asociados y auditoría dummy."
)

replace(
    "sql/cleanup_test_data.sql",
    "-- No se borran special_results de producción. Si cargaste resultados especiales dummy, bórralos manualmente después de confirmar el torneo afectado.",
    "-- No se borran special_results de producción. Para limpiar resultados de prueba usa reset_tournament_results() o reset_full_test() desde el panel/migración de mantenimiento."
)


# ============================================================
# sql/migrations/20260610_roles_and_admin_maintenance.sql
# ============================================================

mig = read("sql/migrations/20260610_roles_and_admin_maintenance.sql")

if "root_count integer" not in mig:
    mig = mig.replace(
        "create or replace function public.set_profile_role(target_profile_id uuid, new_role varchar)\nreturns void language plpgsql security definer set search_path = public as $$\nbegin",
        "create or replace function public.set_profile_role(target_profile_id uuid, new_role varchar)\nreturns void language plpgsql security definer set search_path = public as $$\ndeclare\n  current_role varchar;\n  root_count integer;\nbegin"
    )

    mig = mig.replace(
        "  if new_role not in ('ROOT', 'ADMIN', 'USER') then\n    raise exception 'Rol inválido: %', new_role;\n  end if;\n\n  update public.profiles",
        "  if new_role not in ('ROOT', 'ADMIN', 'USER') then\n    raise exception 'Rol inválido: %', new_role;\n  end if;\n\n  select role into current_role from public.profiles where id = target_profile_id;\n\n  if current_role is null then\n    raise exception 'Usuario no encontrado';\n  end if;\n\n  if current_role = 'ROOT' and new_role <> 'ROOT' then\n    select count(*) into root_count from public.profiles where role = 'ROOT';\n    if root_count <= 1 then\n      raise exception 'No puedes quitar el último ROOT';\n    end if;\n  end if;\n\n  update public.profiles"
    )

write("sql/migrations/20260610_roles_and_admin_maintenance.sql", mig)


# ============================================================
# sql/migrations/20260611_settings_distribution_90_10.sql
# ARCHIVO NUEVO
# ============================================================

write("sql/migrations/20260611_settings_distribution_90_10.sql", """-- Pronostix v2 - ajuste de constraint de distribución 90/10
-- Permite premios 50% + 25% + 15% y comisión admin 10%.

begin;

alter table public.settings
  drop constraint if exists settings_check;

alter table public.settings
  drop constraint if exists settings_distribution_total_check;

alter table public.settings
  add constraint settings_distribution_total_check
  check (admin_percentage + first_place_percentage + second_place_percentage + third_place_percentage = 100);

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

commit;
""")


# ============================================================
# sql/schema.sql
# ============================================================

schema = read("sql/schema.sql")
schema = schema.replace(
    "entry_fee numeric(12,2) not null default 100",
    "entry_fee numeric(12,2) not null default 200"
)
schema = schema.replace(
    "second_place_percentage numeric(5,2) not null default 30",
    "second_place_percentage numeric(5,2) not null default 25"
)
schema = schema.replace(
    "third_place_percentage numeric(5,2) not null default 20",
    "third_place_percentage numeric(5,2) not null default 15"
)
schema = schema.replace(
    "check(first_place_percentage + second_place_percentage + third_place_percentage = 100)",
    "check(admin_percentage + first_place_percentage + second_place_percentage + third_place_percentage = 100)"
)
schema = schema.replace(
    "values(1,100,10,50,30,20,1);",
    "values(1,200,10,50,25,15,1);"
)
write("sql/schema.sql", schema)


# ============================================================
# sql/seed_base_data.sql
# ============================================================

replace(
    "sql/seed_base_data.sql",
    "values (1, 100, 10, 50, 30, 20, 1, false, false)",
    "values (1, 200, 10, 50, 25, 15, 1, false, false)"
)


# ============================================================
# sql/validate_pre_production_clean.sql
# ARCHIVO NUEVO
# ============================================================

write("sql/validate_pre_production_clean.sql", """-- Pronostix v2 - verificación pre-producción de limpieza
-- Ejecutar en Supabase SQL Editor después de aplicar limpiezas/migraciones y antes de liberar.
-- Objetivo: detectar datos dummy o capturas/resultados que NO deben quedar si aún estás cerrando pruebas.

with dummy_users(id) as (
  values
  ('00000000-0000-0000-0000-000000000001'::uuid),
  ('00000000-0000-0000-0000-000000000002'::uuid),
  ('00000000-0000-0000-0000-000000000003'::uuid),
  ('00000000-0000-0000-0000-000000000004'::uuid),
  ('00000000-0000-0000-0000-000000000005'::uuid),
  ('00000000-0000-0000-0000-000000000006'::uuid)
), checks as (
  select 'profiles_dummy' as check_name, count(*)::int as found from public.profiles p join dummy_users d on d.id = p.id
  union all
  select 'auth_users_dummy', count(*)::int from auth.users u join dummy_users d on d.id = u.id
  union all
  select 'predictions_total', count(*)::int from public.predictions
  union all
  select 'special_predictions_total', count(*)::int from public.special_predictions
  union all
  select 'special_results_total', count(*)::int from public.special_results
  union all
  select 'matches_finished_or_scored', count(*)::int from public.matches where status <> 'SCHEDULED' or home_score is not null or away_score is not null
  union all
  select 'settings_missing', case when exists(select 1 from public.settings where id = 1) then 0 else 1 end
  union all
  select 'settings_entry_fee_not_200', count(*)::int from public.settings where id = 1 and entry_fee <> 200
  union all
  select 'settings_prizes_not_50_25_15_10', count(*)::int from public.settings where id = 1 and (first_place_percentage <> 50 or second_place_percentage <> 25 or third_place_percentage <> 15 or admin_percentage <> 10)
  union all
  select 'settings_lock_not_1_minute', count(*)::int from public.settings where id = 1 and lock_minutes_before_match <> 1
)
select
  check_name,
  found,
  case when found = 0 then 'OK' else 'REVISAR' end as status
from checks
order by check_name;
""")


print("")
print("LISTO.")
print("Archivos modificados/creados:")
print("- README.md")
print("- css/styles.css")
print("- docs/entrega-rapida.md")
print("- index.html")
print("- js/admin.js")
print("- js/rankings.js")
print("- js/rules.js")
print("- sql/cleanup_test_data.sql")
print("- sql/migrations/20260610_roles_and_admin_maintenance.sql")
print("- sql/migrations/20260611_settings_distribution_90_10.sql")
print("- sql/schema.sql")
print("- sql/seed_base_data.sql")
print("- sql/validate_pre_production_clean.sql")
print("")
print("Ahora corre: git diff")
