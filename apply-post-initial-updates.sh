#!/usr/bin/env bash
set -euo pipefail

echo "== Pronostix: aplicando updates post-versión inicial =="

test -f js/app.js || { echo "ERROR: no existe js/app.js"; exit 1; }
test -f index.html || { echo "ERROR: no existe index.html"; exit 1; }

stamp="$(date +%Y%m%d%H%M%S)"
cp js/app.js "js/app.js.bak.$stamp"
[ -f config.js ] && cp config.js "config.js.bak.$stamp"
[ -f index.html ] && cp index.html "index.html.bak.$stamp"

mkdir -p docs

cat > config.example.js <<'EOF'
window.PRONOSTIX_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU_SUPABASE_ANON_KEY_PUBLICA",
  platformName: "Pronostix",
  siteUrl: "https://TU-USUARIO.github.io/quiniela.mundial/"
};
EOF

python3 - <<'PY'
from pathlib import Path
import re

p = Path("config.js")
old = p.read_text() if p.exists() else ""

def pick(pattern, default):
    m = re.search(pattern, old)
    return m.group(1) if m else default

url = pick(r'supabaseUrl\s*:\s*["\']([^"\']+)["\']', "https://TU-PROYECTO.supabase.co")
key = pick(r'supabaseAnonKey\s*:\s*["\']([^"\']+)["\']', "TU_SUPABASE_ANON_KEY_PUBLICA")
name = pick(r'platformName\s*:\s*["\']([^"\']+)["\']', "Pronostix")
site = pick(r'siteUrl\s*:\s*["\']([^"\']+)["\']', "https://javieroot.github.io/quiniela.mundial/")

p.write_text(f'''window.PRONOSTIX_CONFIG = {{
  supabaseUrl: "{url}",
  supabaseAnonKey: "{key}",
  platformName: "{name}",
  siteUrl: "{site}"
}};
''')
PY

cat > index.html <<'EOF'
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pronostix</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <link rel="stylesheet" href="css/styles.css?v=20260610c" />
</head>
<body>
  <div id="app"></div>
  <script src="config.js?v=20260610c"></script>
  <script src="js/app.js?v=20260610c"></script>
</body>
</html>
EOF

cat > docs/future-modularization.md <<'EOF'
# Propuesta futura de modularización

No se recomienda hacer un refactor grande antes de producción. La app debe salir estable primero.

## Objetivo

Separar `js/app.js` en módulos pequeños sin cambiar comportamiento.

## Orden sugerido

1. `js/core/config.js`
   - lectura de `window.PRONOSTIX_CONFIG`
   - validación de `supabaseUrl`, `supabaseAnonKey`, `siteUrl`

2. `js/core/supabase.js`
   - creación del cliente Supabase
   - helpers de sesión

3. `js/core/state.js`
   - estado global
   - carga inicial de usuario, perfil, torneos, settings

4. `js/features/auth.js`
   - login
   - registro
   - recuperación
   - cambio de contraseña post-redirect

5. `js/features/predictions.js`
   - render de partidos
   - guardado de pronósticos
   - bloqueo visible

6. `js/features/specials.js`
   - especiales
   - validación de no repetir campeón/subcampeón/tercer lugar

7. `js/features/rankings.js`
   - cálculo de puntos
   - ranking denso
   - desempates
   - premios

8. `js/features/admin.js`
   - pagos
   - resultados
   - settings
   - resumen de bolsa

9. `js/ui/components.js`
   - botones
   - tablas
   - cards
   - toast

## Reglas para cuando se haga

- No cambiar SQL.
- No cambiar nombres de columnas.
- No cambiar reglas de negocio.
- Refactor en commits pequeños.
- Después de mover cada módulo, probar login, ranking, admin y predicciones.
EOF

python3 - <<'PY'
from pathlib import Path
import re

p = Path("js/app.js")
s = p.read_text()

def note(msg):
    print(f"[update] {msg}")

def replace(old, new, label):
    global s
    if old in s:
        s = s.replace(old, new)
        note(f"OK {label}")
        return True
    note(f"SKIP {label} - patrón no encontrado")
    return False

def re_replace(pattern, new, label, flags=re.S):
    global s
    ns, n = re.subn(pattern, new, s, count=1, flags=flags)
    if n:
        s = ns
        note(f"OK {label}")
        return True
    note(f"SKIP {label} - patrón no encontrado")
    return False

# 1) Helpers siteUrl / lock minutes
if "function getAuthRedirectUrl()" not in s:
    replace(
'''const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));''',
'''const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const lockMinutes = () => Math.max(0, num(state.settings?.lock_minutes_before_match, 1));
function getAuthRedirectUrl() {
  return cfg.siteUrl;
}
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));''',
"helpers siteUrl/lockMinutes"
    )
else:
    re_replace(
        r'function getAuthRedirectUrl\(\)\s*\{[\s\S]*?\}',
        'function getAuthRedirectUrl() {\n  return cfg.siteUrl;\n}',
        "getAuthRedirectUrl usa cfg.siteUrl"
    )

# 2) requireConfig siteUrl
re_replace(
    r'if \(!cfg\.supabaseUrl \|\| !cfg\.supabaseAnonKey\) throw new Error\("Falta configurar config\.js"\);',
    'if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !cfg.siteUrl) throw new Error("Falta configurar config.js: supabaseUrl, supabaseAnonKey y siteUrl son obligatorios");',
    "requireConfig exige siteUrl"
)

# 3) init auth recovery event
re_replace(
r'''async function init\(\) \{
  requireConfig\(\);
  sb = supabase\.createClient\(cfg\.supabaseUrl, cfg\.supabaseAnonKey\);
  sb\.auth\.onAuthStateChange\(async \(_event, session\) => \{ state\.session = session; await bootstrap\(\); \}\);
  const \{ data \} = await sb\.auth\.getSession\(\);
  state\.session = data\.session;
  await bootstrap\(\);
\}''',
'''async function init() {
  requireConfig();
  sb = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  sb.auth.onAuthStateChange(async (event, session) => {
    state.session = session;
    if (event === "PASSWORD_RECOVERY") {
      state.needsPasswordUpdate = true;
    }
    await bootstrap();
  });
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  if (location.hash.includes("type=recovery")) state.needsPasswordUpdate = true;
  await bootstrap();
}''',
"init password recovery"
)

# 4) render update password gate
replace(
'''function render() {
  if (!state.session) return renderAuth();''',
'''function render() {
  if (state.needsPasswordUpdate && state.session) return renderUpdatePassword();
  if (!state.session) return renderAuth();''',
"render update password gate"
)

# 5) update password screen
if "function renderUpdatePassword()" not in s:
    marker = "window.renderAuth = renderAuth;"
    block = r'''
function renderUpdatePassword() {
  app.innerHTML = `<main class="auth-page"><section class="auth-card">
    <h1 class="auth-title">Nueva contraseña</h1>
    <p class="text-sm text-slate-600 mb-4">Escribe tu nueva contraseña para completar la recuperación.</p>
    <form onsubmit="updatePassword(event)" class="stack">
      <input id="new-password" type="password" minlength="6" placeholder="Nueva contraseña" required />
      <button class="btn btn-primary">Actualizar contraseña</button>
    </form>
  </section></main>`;
}
window.updatePassword = async (e) => {
  e.preventDefault();
  const password = document.getElementById("new-password").value;
  const { error } = await sb.auth.updateUser({ password });
  if (error) return alert(error.message);
  state.needsPasswordUpdate = false;
  history.replaceState(null, "", getAuthRedirectUrl());
  await bootstrap();
};

'''
    replace(marker, block + marker, "renderUpdatePassword")

# fix accidental brace if Python replacement injected typo
s = s.replace("}\n\n# fix accidental", "\n\n# fix accidental")

# 6) auth redirects
s = s.replace("emailRedirectTo: location.href", "emailRedirectTo: getAuthRedirectUrl()")
s = s.replace("redirectTo: location.href", "redirectTo: getAuthRedirectUrl()")
s = s.replace("redirectTo: window.location.href", "redirectTo: getAuthRedirectUrl()")
note("OK redirects Supabase usan cfg.siteUrl cuando existía location.href")

# 7) Dense ranking + display_name only
re_replace(
r'rows\.forEach\(\(r,\s*i\)\s*=>\s*\{\s*if \(!prev \|\| compareRowsNoAlpha\(r,\s*prev\) !== 0\) pos = i \+ 1;\s*r\.position = pos;\s*prev = r;\s*\}\);',
'''rows.forEach((r) => {
    if (!prev || compareRowsNoAlpha(r, prev) !== 0) pos += 1;
    r.position = pos;
    prev = r;
  });''',
"ranking denso"
)

re_replace(
r'\$\{esc\(r\.display_name\)\}\s*<span class="text-slate-400">@\$\{esc\(r\.username\)\}</span>',
'${esc(r.display_name)}',
"ranking muestra solo display_name"
)

# 8) Lock text in predictions
if "Se bloquea ${lockMinutes()} minuto(s) antes del partido" not in s:
    s = s.replace(
'''<p class="text-sm text-slate-500">${dt(m.kickoff_at)} · ${locked ? "Bloqueado" : "Abierto"}</p>''',
'''<p class="text-sm text-slate-500">${dt(m.kickoff_at)} · ${locked ? "Bloqueado" : "Abierto"}</p>
        <p class="text-sm font-bold ${locked ? "text-red-700" : "text-emerald-700"}">Se bloquea ${lockMinutes()} minuto(s) antes del partido</p>'''
    )
    note("OK texto de bloqueo por partido")
else:
    note("SKIP texto de bloqueo ya existe")

# 9) Prize functions / renderRanking
re_replace(
r'''function prizeWinners\([\s\S]*?function renderRules\(\)''',
r'''function prizeWinners(rows, participantCount) {
  const entry = num(state.settings?.entry_fee, 0);
  const adminPct = num(state.settings?.admin_percentage, 0);
  const pool = participantCount * entry;
  const adminFee = pool * adminPct / 100;
  const net = pool - adminFee;
  const pct = {
    1: num(state.settings?.first_place_percentage, 0),
    2: num(state.settings?.second_place_percentage, 0),
    3: num(state.settings?.third_place_percentage, 0)
  };
  const places = [1, 2, 3].map((place) => {
    const winners = rows.filter((r) => r.position === place);
    const totalPrize = net * pct[place] / 100;
    const each = winners.length ? totalPrize / winners.length : 0;
    return { place, percentage: pct[place], totalPrize, each, winners };
  });
  return { pool, adminFee, net, places };
}
function renderPrizeSummary(title, prize) {
  const placeName = { 1: "1° lugar", 2: "2° lugar", 3: "3° lugar" };
  return `<section class="card mb-6">
    <h3 class="text-xl font-bold mb-2">${title}</h3>
    <p>Bolsa bruta: <b>${money(prize.pool)}</b> · Comisión admin: <b>${money(prize.adminFee)}</b> · Bolsa neta: <b>${money(prize.net)}</b></p>
    <div class="grid md:grid-cols-3 gap-3 mt-3">
      ${prize.places.map((p) => `<div class="p-3 rounded-xl bg-slate-50 border">
        <h4 class="font-bold">${placeName[p.place]} (${p.percentage}%)</h4>
        <p>Premio total: <b>${money(p.totalPrize)}</b></p>
        ${p.winners.length ? p.winners.map((w) => `<p>${esc(w.display_name)} recibe <b>${money(p.each)}</b></p>`).join("") : "<p class='text-slate-500'>Sin ganador asignado todavía.</p>"}
      </div>`).join("")}
    </div>
  </section>`;
}
async function renderRanking() {
  await loadAll();
  const general = rankRows(state.profiles);
  const official = rankRows(state.profiles.filter((p) => p.payment_status === "PAID"));
  const table = (rows, showPaid) => `<table class="table"><thead><tr><th>Pos</th><th>Usuario</th><th>Partidos</th><th>Especiales</th><th>Total</th><th>Exactos</th><th>Resultados</th>${showPaid ? "<th>Pago</th>" : ""}</tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r.position}</td><td>${esc(r.display_name)}</td><td>${r.match_points}</td><td>${r.special_points}</td><td><b>${r.total}</b></td><td>${r.exacts}</td><td>${r.results}</td>${showPaid ? `<td>${badge(r.payment_status)}</td>` : ""}</tr>`).join("")}
  </tbody></table>`;
  const generalPrize = prizeWinners(general, state.profiles.length);
  const officialPrize = prizeWinners(official, official.length);
  app.innerHTML = shell("rankings", `
    <h2 class="text-3xl font-black mb-4">Rankings</h2>
    <h3 class="text-xl font-bold mb-2">Ranking general</h3>
    <p class="mb-3 text-slate-600">Incluye a todos y simula premios como si todos hubieran pagado.</p>
    ${renderPrizeSummary("Premios simulados - General", generalPrize)}
    ${table(general, true)}
    <h3 class="text-xl font-bold mt-8 mb-2">Ranking oficial</h3>
    <p class="mb-3 text-slate-600">Solo usuarios con pago PAID participan por premios reales.</p>
    ${renderPrizeSummary("Premios reales - Oficial", officialPrize)}
    ${table(official, false)}
  `);
}
function renderRules()''',
"premios integrados y ranking"
)

# 10) Rules/FAQ
re_replace(
r'''function renderRules\(\) \{[\s\S]*?\n\} async function renderAdmin''',
'''function renderRules() {
  app.innerHTML = shell("rules", `
    <h2 class="text-3xl font-black mb-4">Reglas y FAQ</h2>
    <section class="grid gap-4">
      <div class="card"><h3 class="text-xl font-bold">Puntos por partido</h3><p>Marcador exacto: 3 puntos. Resultado correcto sin marcador exacto: 1 punto. Incorrecto: 0 puntos.</p></div>
      <div class="card"><h3 class="text-xl font-bold">Puntos especiales</h3><p>Campeón: 5, subcampeón: 3, tercer lugar: 2, máximo goleador: 5.</p></div>
      <div class="card"><h3 class="text-xl font-bold">Bloqueo</h3><p>Cada partido se bloquea ${lockMinutes()} minuto(s) antes de iniciar. Los especiales se bloquean al inicio del torneo activo.</p></div>
      <div class="card"><h3 class="text-xl font-bold">Ranking general vs oficial</h3><p>El general incluye a todos los usuarios y simula premios como si todos hubieran pagado. El oficial solo incluye usuarios con pago PAID y define premios reales.</p></div>
      <div class="card"><h3 class="text-xl font-bold">Premios</h3><p>Bolsa = usuarios pagados × costo. Se resta comisión admin. La bolsa neta se reparte según porcentajes de 1°, 2° y 3°. Si hay empate, se divide entre los ganadores de ese lugar.</p></div>
      <div class="card"><h3 class="text-xl font-bold">Desempates</h3><p>Orden: total, puntos especiales, exactos, resultados acertados y última modificación más antigua. No se usa orden alfabético.</p></div>
      <div class="card"><h3 class="text-xl font-bold">FAQ</h3><p><b>¿Puedo cambiar pronósticos?</b> Sí, hasta el bloqueo del partido. <b>¿Los no pagados aparecen?</b> Sí, en ranking general. <b>¿Ganan premios reales?</b> Solo si están PAID en ranking oficial.</p></div>
    </section>
  `);
}
async function renderAdmin''',
"FAQ/reglas completas"
)

# 11) Admin tournament name / cleanup / validations
if "cleanup_test_data.sql" not in s:
    s = s.replace(
'''<h2 class="text-3xl font-black mb-4">Admin</h2>''',
'''<h2 class="text-3xl font-black mb-4">Admin</h2>
    <section class="card mb-6">
      <h3 class="text-xl font-bold mb-2">Torneo activo</h3>
      <input id="tournament-name" value="${esc(state.tournament?.name || "")}" placeholder="Nombre del torneo" />
      <button class="btn btn-primary mt-2" onclick="saveTournamentName()">Guardar nombre</button>
    </section>'''
    )
    s = s.replace(
'''<section class="card"><h3 class="text-xl font-bold mb-2">Settings</h3>''',
'''<section class="card mb-6">
      <h3 class="text-xl font-bold mb-2">Resumen de bolsa oficial</h3>
      ${renderPrizeSummary("Premios calculados - Oficial", prizeWinners(rankRows(state.profiles.filter((p) => p.payment_status === "PAID")), state.profiles.filter((p) => p.payment_status === "PAID").length))}
      <p class="text-sm text-slate-600">Para limpiar datos dummy antes de producción, ejecuta <code>sql/cleanup_test_data.sql</code> en Supabase SQL Editor.</p>
    </section>
    <section class="card"><h3 class="text-xl font-bold mb-2">Settings</h3>'''
    )
    note("OK admin torneo/resumen/cleanup")
else:
    note("SKIP admin cleanup ya existe")

if "window.saveTournamentName" not in s:
    marker = "window.savePayment = async (id) =>"
    insert = '''
window.saveTournamentName = async () => {
  const name = document.getElementById("tournament-name").value.trim();
  if (!name) return alert("El nombre del torneo no puede ir vacío");
  const { error } = await sb.from("tournaments").update({ name }).eq("id", state.tournament.id);
  if (error) return alert(error.message);
  alert("Torneo actualizado");
  await bootstrap();
};

'''
    s = s.replace(marker, insert + marker)
    note("OK saveTournamentName")
else:
    note("SKIP saveTournamentName ya existe")

# Settings validation
if "Los porcentajes de premios deben sumar 100" not in s:
    re_replace(
r'''window\.saveSettings = async \(\) => \{[\s\S]*?\n\};''',
'''window.saveSettings = async () => {
  const payload = {
    entry_fee: num(document.getElementById("entry_fee").value),
    admin_percentage: num(document.getElementById("admin_percentage").value),
    first_place_percentage: num(document.getElementById("first_place_percentage").value),
    second_place_percentage: num(document.getElementById("second_place_percentage").value),
    third_place_percentage: num(document.getElementById("third_place_percentage").value),
    lock_minutes_before_match: num(document.getElementById("lock_minutes_before_match").value)
  };
  if (payload.entry_fee < 0 || payload.lock_minutes_before_match < 0) return alert("Costo y bloqueo no pueden ser negativos");
  if (payload.admin_percentage < 0 || payload.admin_percentage > 100) return alert("La comisión admin debe estar entre 0 y 100");
  const prizeSum = payload.first_place_percentage + payload.second_place_percentage + payload.third_place_percentage;
  if (prizeSum !== 100) return alert(`Los porcentajes de premios deben sumar 100. Actualmente suman ${prizeSum}.`);
  const { error } = await sb.from("settings").update(payload).eq("tournament_id", state.tournament.id);
  if (error) return alert(error.message);
  await bootstrap();
};''',
"validación settings"
    )
else:
    note("SKIP validación settings ya existe")

p.write_text(s)
PY

echo
echo "== Validando JS =="
if command -v node >/dev/null 2>&1; then
  node --check js/app.js
elif command -v nodejs >/dev/null 2>&1; then
  nodejs --check js/app.js
else
  echo "WARN: node no está instalado; saltando validación node --check."
fi

echo
echo "== Listo. Revisa cambios =="
git status --short || true
echo
echo "Siguiente:"
echo "  1) Abre config.js y confirma siteUrl"
echo "  2) Prueba local con otro puerto si 8080 está ocupado:"
echo "     python3 -m http.server 8081"
echo "  3) Abre http://localhost:8081"
echo "  4) Si todo jala:"
echo "     git add index.html config.js config.example.js js/app.js docs/future-modularization.md"
echo "     git commit -m 'Fix Pronostix v2 auth redirects, rankings, prizes and admin polish'"
echo "     git push origin TU_RAMA"
