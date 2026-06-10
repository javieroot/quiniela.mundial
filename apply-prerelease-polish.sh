#!/usr/bin/env bash
set -euo pipefail

echo "== Pronostix v2: aplicando polish pre-liberación =="

mkdir -p docs sql

python3 - <<'PY'
from pathlib import Path
import re

def write(path, content):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content)

# 1) data.js: quitar short_name de query
p = Path("js/data.js")
s = p.read_text()
s = re.sub(
    r'home_team:teams!matches_home_team_id_fkey\(id,name,short_name\),\s*away_team:teams!matches_away_team_id_fkey\(id,name,short_name\)',
    'home_team:teams!matches_home_team_id_fkey(id,name,code), away_team:teams!matches_away_team_id_fkey(id,name,code)',
    s
)
s = s.replace(
    'home_team:teams!matches_home_team_id_fkey(id,name,short_name), away_team:teams!matches_away_team_id_fkey(id,name,short_name)',
    'home_team:teams!matches_home_team_id_fkey(id,name,code), away_team:teams!matches_away_team_id_fkey(id,name,code)'
)
p.write_text(s)

# 2) predictions.js: labels con code/name, no short_name
p = Path("js/predictions.js")
s = p.read_text()
s = s.replace(
    'match.home_team?.short_name || match.home_team?.code || "Local"',
    'match.home_team?.code || match.home_team?.name || "Local"'
)
s = s.replace(
    'match.away_team?.short_name || match.away_team?.code || "Visita"',
    'match.away_team?.code || match.away_team?.name || "Visita"'
)
s = s.replace(
    'parts.push(`Grupo ${P.esc(match.group_name)}`);',
    'parts.push(P.esc(match.group_name).toLowerCase().startsWith("grupo") ? P.esc(match.group_name) : `Grupo ${P.esc(match.group_name)}`);'
)
p.write_text(s)

# 3) dashboard.js completo
write("js/dashboard.js", r'''(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  async function renderDashboard() {
    const paid = P.state.profile?.payment_status === "PAID";
    const { matches } = await Data.getTournamentData();
    const now = Date.now();
    const nextMatch = matches.find(match => new Date(match.kickoff_at).getTime() >= now) || matches[0] || null;
    const [{ data: predictions }, { data: specialPrediction }] = await Promise.all([
      P.sb.from("predictions").select("id").eq("user_id", P.state.session.user.id),
      P.sb.from("special_predictions").select("champion_team_id,runner_up_team_id,third_place_team_id,top_scorer_player_id").eq("user_id", P.state.session.user.id).eq("tournament_id", P.state.activeTournament?.id).maybeSingle()
    ]);
    const predictionCount = predictions?.length || 0;
    const totalMatches = matches.length;
    const specialsDone = Boolean(specialPrediction?.champion_team_id && specialPrediction?.runner_up_team_id && specialPrediction?.third_place_team_id && specialPrediction?.top_scorer_player_id);
    const nextLabel = nextMatch ? `${P.esc(nextMatch.home_team?.name || "Local")} vs ${P.esc(nextMatch.away_team?.name || "Visita")}` : "Sin partidos";
    const nextVenue = nextMatch ? [nextMatch.group_name, nextMatch.stadium, nextMatch.city].filter(Boolean).map(P.esc).join(" · ") : "Carga calendario en Admin";

    UI.shell(`<section class="hero card">
      <div>
        <p class="eyebrow">Torneo activo</p>
        <h2>${P.esc(P.state.activeTournament?.name || "Sin torneo activo")}</h2>
        <p>Los pronósticos se bloquean ${P.lockMinutes()} minuto(s) antes de cada partido.</p>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="PronostixApp.go('predictions')">Pronosticar partidos</button>
        <button class="btn btn-secondary" onclick="PronostixApp.go('specials')">Especiales</button>
      </div>
    </section>
    <section class="grid md:grid-cols-3 gap-4">
      <div class="card stat"><span>Torneo activo</span><b>${P.esc(P.state.activeTournament?.name || "Pendiente")}</b><small>Nombre configurado por admin.</small></div>
      <div class="card stat"><span>Mi estado de pago</span><b>${paid ? "PAGADO" : "NO PAGADO"}</b><small>${paid ? "Participas por premios oficiales." : "Apareces en general; confirma pago para premios."}</small></div>
      <div class="card stat"><span>Costo de inscripción</span><b>${P.money(P.state.settings?.entry_fee)}</b><small>Importe vigente del torneo.</small></div>
      <div class="card stat"><span>Próximo partido</span><b>${nextLabel}</b><small>${nextMatch ? `${P.dt(nextMatch.kickoff_at)} · ${nextVenue || "Sede por confirmar"}` : "Sin calendario disponible."}</small></div>
      <div class="card stat"><span>Mis pronósticos</span><b>${predictionCount}/${totalMatches}</b><small>Partidos capturados del calendario actual.</small></div>
      <div class="card stat"><span>Especiales</span><b>${specialsDone ? "Capturados" : "Pendientes"}</b><small>Campeón, subcampeón, tercer lugar y goleador.</small></div>
    </section>
    <section class="card p-5"><h3 class="text-xl font-black">Checklist para competir</h3>
      <ol class="list-decimal ml-5 mt-2 text-slate-700 space-y-1">
        <li>Guarda marcador local/visitante antes del bloqueo.</li>
        <li>Llena campeón, subcampeón, tercer lugar y goleador.</li>
        <li>Revisa ranking general para compararte y ranking oficial para premios reales.</li>
        <li>Confirma con el admin que tu estado sea PAGADO.</li>
      </ol>
    </section>`);
  }

  window.PronostixDashboard = { renderDashboard };
}());
''')

# 4) rankings.js: presentación simple usuario normal, adminView opcional
p = Path("js/rankings.js")
s = p.read_text()
s = re.sub(
    r'function renderPrizeSummary\(title, prizes\) \{[\s\S]*?\n  \}\n\n  function positionIcon',
    r'''function renderPrizeSummary(title, prizes, adminView = false) {
    return `<section class="card p-5 prize-card">
      <div class="section-title"><div><h3>${P.esc(title)}</h3><p>Bolsa de premios: <b>${P.money(prizes.netPool)}</b>${adminView ? ` · Bolsa total: <b>${P.money(prizes.pool)}</b> · Comisión admin: <b>${P.money(prizes.adminFee)}</b>` : ""}</p></div></div>
      <div class="grid md:grid-cols-3 gap-3 mt-3">
        ${prizes.places.map(place => `<div class="prize-place"><h4>${place.place}° lugar</h4><p>Monto total: <b>${P.money(place.prize)}</b>${adminView ? ` <small>(${place.percentage}%)</small>` : ""}</p>${place.winners.length ? place.winners.map(winner => `<p>${UI.userChip(winner, false)} recibe <b>${P.money(place.each)}</b></p>`).join("") : "<p class='text-slate-500'>Sin ganador por ahora.</p>"}</div>`).join("")}
      </div>
    </section>`;
  }

  function positionIcon''',
    s
)
s = s.replace(
    '<span class="pill">Ranking denso: 1, 1, 2, 3</span>',
    '<span class="pill">Los empates comparten posición y premio.</span>'
)
s = s.replace(
    'Rankings.renderPrizeSummary("Premios calculados", prizes)',
    'Rankings.renderPrizeSummary("Premios calculados", prizes, true)'
)
p.write_text(s)

# 5) rules.js completo
write("js/rules.js", r'''(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;

  function renderRules() {
    UI.shell(`<section class="card p-5">
      <div class="section-title"><div><h2>Reglas</h2><p>Resumen claro para jugar y entender rankings/premios.</p></div></div>
      <div class="rules-list mt-4">
        <article><h3>Puntos por partido</h3><p>Marcador exacto: <b>3 puntos</b>. Resultado correcto sin marcador exacto: <b>1 punto</b>. Incorrecto: <b>0 puntos</b>.</p></article>
        <article><h3>Puntos especiales</h3><p>Campeón: <b>5</b>. Subcampeón: <b>3</b>. Tercer lugar: <b>2</b>. Máximo goleador: <b>5</b>.</p></article>
        <article><h3>Bloqueo de pronósticos</h3><p>Cada partido se bloquea <b>${P.lockMinutes()} minuto(s)</b> antes de iniciar. Después del bloqueo no se puede modificar.</p></article>
        <article><h3>Bloqueo de especiales</h3><p>Los especiales se bloquean al iniciar el torneo. Los especiales bloqueados siguen visibles.</p></article>
        <article><h3>Ranking general y oficial</h3><p>El general incluye a todos los registrados y simula premios como si todos hubieran pagado. El oficial incluye solo usuarios con estado <b>PAGADO</b> y define premios reales.</p></article>
        <article><h3>Desempates</h3><p>Orden: puntos totales, puntos especiales, marcadores exactos, resultados acertados y última modificación más antigua. No se usa orden alfabético.</p></article>
      </div>
    </section>
    <section class="card p-5"><h2 class="text-2xl font-black">FAQ</h2>
      <div class="faq-grid mt-4">
        <article><h3>¿Puedo ganar si no he pagado?</h3><p>Puedes aparecer arriba en el ranking general, pero solo usuarios con estado <b>PAGADO</b> participan por premios oficiales.</p></article>
        <article><h3>¿Qué pasa si empato?</h3><p>Los empatados comparten posición. Si el empate es en zona de premio, el monto de ese lugar se reparte entre los ganadores empatados.</p></article>
        <article><h3>¿Puedo cambiar un pronóstico?</h3><p>Sí, mientras el partido no esté bloqueado. Una vez bloqueado, queda visible pero ya no editable.</p></article>
        <article><h3>¿Quién captura resultados?</h3><p>El admin captura resultados de partidos y especiales manualmente desde el panel de administración.</p></article>
        <article><h3>¿Qué pasa si falla la actualización automática?</h3><p>Por ahora no hay actualización automática implementada. La captura manual es la fuente principal; la API queda preparada para una fase futura.</p></article>
      </div>
    </section>`);
  }

  window.PronostixRules = { renderRules };
}());
''')

# 6) admin.js textos API futura y botón deshabilitado
p = Path("js/admin.js")
s = p.read_text()
s = s.replace("Preparación para resultados automáticos", "Preparación para API futura")
s = s.replace(
    "La captura manual sigue siendo el respaldo principal. Esta sección solo deja lista la configuración para conectar una API después.",
    "La captura manual sigue siendo la fuente principal. La API automática NO está implementada; estos campos solo preparan una integración futura."
)
s = s.replace(" Habilitar API automática de resultados de partidos", " Preparar API futura de resultados de partidos")
s = s.replace(
    '<button class="btn btn-secondary mt-3" onclick="PronostixAdmin.saveAutomationSettings()">Guardar preparación API</button>',
    '<div class="flex gap-2 mt-3"><button class="btn btn-secondary" onclick="PronostixAdmin.saveAutomationSettings()">Guardar preparación API</button><button class="btn btn-secondary" disabled>Sincronizar resultados (próximamente)</button></div>'
)
s = s.replace(
    "La captura manual se mantiene como respaldo aunque después se conecte una API.",
    "La captura manual es la fuente principal de resultados. La API automática queda para una fase futura."
)
s = s.replace(
    "Captura manual activa; la automatización queda preparada para después.",
    "Captura manual activa. La automatización de especiales queda preparada para después, pero no está implementada."
)
s = s.replace(
    'Rankings.renderPrizeSummary("Premios calculados", prizes)',
    'Rankings.renderPrizeSummary("Premios calculados", prizes, true)'
)
p.write_text(s)

# 7) CSS responsive
p = Path("css/styles.css")
s = p.read_text()
extra = '''
/* Pre-release responsive hardening */
.data-table th,.data-table td,.admin-result-row,.match-card,.prize-place,.stat small,.user-chip{overflow-wrap:anywhere;word-break:break-word}.rules-list{display:grid;gap:12px}.rules-list article{background:#f8fafc;border:1px solid var(--line);border-radius:18px;padding:16px}.rules-list h3{font-weight:950;margin:0 0 6px}.prize-place .user-chip{margin-top:.35rem}.admin-result-row>div{min-width:0}.table-wrap{max-width:100%;-webkit-overflow-scrolling:touch}@media (max-width:760px){.data-table{min-width:760px}.section-title{flex-direction:column}.hero-actions .btn{width:100%}.prize-place{font-size:.94rem}}
'''
if "Pre-release responsive hardening" not in s:
    s = s.rstrip() + extra
p.write_text(s)

# 8) cache final4
p = Path("index.html")
s = p.read_text()
s = re.sub(r"20260610(?:c|-final\d+)?", "20260610-final4", s)
p.write_text(s)

# 9) schema: quitar seed dummy si existe
p = Path("sql/schema.sql")
s = p.read_text()
marker = "-- Datos dummy determinísticos para pruebas funcionales."
if marker in s:
    s = s[:s.index(marker)].rstrip() + "\n\n-- Fin de estructura limpia.\n-- Para datos base de producción usa sql/seed_base_data.sql.\n-- Para datos de prueba usa un seed separado o crea usuarios desde Supabase Auth.\n"
p.write_text(s)

# 10) seed base separado
write("sql/seed_base_data.sql", r'''-- Pronostix v2 - seed base de producción / staging
-- Ejecuta después de sql/schema.sql en una base limpia.
-- No crea usuarios ni pronósticos. No inventa datos oficiales completos.
-- Ajusta nombres, equipos, fechas, sedes y jugadores antes de producción real.

begin;

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
values (1, 100, 10, 50, 30, 20, 1, false, false)
on conflict (id) do update set
  entry_fee = excluded.entry_fee,
  admin_percentage = excluded.admin_percentage,
  first_place_percentage = excluded.first_place_percentage,
  second_place_percentage = excluded.second_place_percentage,
  third_place_percentage = excluded.third_place_percentage,
  lock_minutes_before_match = excluded.lock_minutes_before_match,
  results_api_enabled = excluded.results_api_enabled,
  special_results_api_enabled = excluded.special_results_api_enabled;

insert into public.tournaments(id, name, starts_at, is_active)
values ('00000000-0000-0000-0000-000000000101', 'Torneo Pronostix 2026', '2026-06-11 00:00:00+00', true)
on conflict (id) do update set name = excluded.name, starts_at = excluded.starts_at, is_active = excluded.is_active;

-- Equipos placeholder. Reemplaza/expande con lista oficial antes de producción.
insert into public.teams(id, tournament_id, name, code) values
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'México', 'MEX'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', 'Argentina', 'ARG'),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', 'Brasil', 'BRA'),
('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000101', 'Francia', 'FRA')
on conflict (id) do update set name = excluded.name, code = excluded.code;

-- Jugadores candidatos placeholder para máximo goleador.
insert into public.players(id, tournament_id, team_id, name) values
('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', 'Jugador México 1'),
('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000202', 'Jugador Argentina 1'),
('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000203', 'Jugador Brasil 1'),
('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000204', 'Jugador Francia 1')
on conflict (id) do update set team_id = excluded.team_id, name = excluded.name;

-- Partidos placeholder. Confirma calendario, grupo/fase, estadio y ciudad antes de producción.
insert into public.matches(id, tournament_id, home_team_id, away_team_id, kickoff_at, group_name, stadium, city, home_score, away_score, status) values
('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202', '2026-06-11 00:00:00+00', 'Grupo/Fase por confirmar', 'Estadio por confirmar', 'Ciudad por confirmar', null, null, 'SCHEDULED'),
('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000204', '2026-06-12 00:00:00+00', 'Grupo/Fase por confirmar', 'Estadio por confirmar', 'Ciudad por confirmar', null, null, 'SCHEDULED')
on conflict (id) do update set
  kickoff_at = excluded.kickoff_at,
  group_name = excluded.group_name,
  stadium = excluded.stadium,
  city = excluded.city,
  status = excluded.status;

commit;
''')

# 11) cleanup seguro
write("sql/cleanup_test_data.sql", r'''-- Pronostix v2 - limpieza segura de datos de prueba
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
''')

# 12) docs mínimos
write("docs/future-modularization.md", """# Estado de modularización

La modularización principal ya está aplicada.

## Estado actual

- `js/core.js`: configuración, cliente Supabase único, estado global y helpers.
- `js/data.js`: consultas Supabase compartidas.
- `js/ui.js`: shell, navegación y helpers visuales.
- `js/auth.js`: registro, login, logout y recuperación.
- `js/dashboard.js`: inicio.
- `js/predictions.js`: pronósticos por partido.
- `js/specials.js`: pronósticos especiales.
- `js/rankings.js`: rankings, puntos y premios.
- `js/rules.js`: reglas y FAQ.
- `js/admin.js`: panel administrador.
- `js/app.js`: bootstrap/router.

## Pendiente futuro

No hacer refactor grande antes de liberar. Si crece el proyecto, evaluar build con Vite o módulos ES, pero mantener compatibilidad GitHub Pages.
""")

print("OK polish pre-liberación aplicado")
PY

echo "== Verificando =="
rg -n "short_name" js || true
rg -n "20260610-final4" index.html
rg -n "Preparación para API futura|Sincronizar resultados" js/admin.js
rg -n "Ranking denso" js || true
for f in js/*.js; do
  if command -v node >/dev/null 2>&1; then node --check "$f"; fi
done

echo "== Listo. Revisa git diff y commitea =="
git status --short
