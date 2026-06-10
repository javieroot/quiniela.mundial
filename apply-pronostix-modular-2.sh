set -e

mkdir -p js css

cat > js/rankings.js <<'EOF'
(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  function matchPoints(prediction, match) {
    if (match.status !== "FINISHED" || prediction.home_score == null || prediction.away_score == null || match.home_score == null || match.away_score == null) return { points: 0, exacts: 0, results: 0 };
    if (prediction.home_score === match.home_score && prediction.away_score === match.away_score) return { points: 3, exacts: 1, results: 0 };
    const sign = (a, b) => Math.sign(Number(a) - Number(b));
    if (sign(prediction.home_score, prediction.away_score) === sign(match.home_score, match.away_score)) return { points: 1, exacts: 0, results: 1 };
    return { points: 0, exacts: 0, results: 0 };
  }

  function oldestModification(current, next) {
    if (!next) return current;
    if (!current) return next;
    return new Date(next) < new Date(current) ? next : current;
  }

  function compareNoAlpha(a, b) {
    return (b.total_points - a.total_points)
      || (b.special_points - a.special_points)
      || (b.exacts - a.exacts)
      || (b.results - a.results)
      || (new Date(a.last_modified) - new Date(b.last_modified));
  }

  async function calculateRows(officialOnly) {
    const all = await Data.loadAllForRanking();
    const matchById = Object.fromEntries(all.matches.map(match => [match.id, match]));
    const rows = all.profiles
      .filter(user => !officialOnly || user.payment_status === "PAID")
      .map(user => ({
        ...user,
        match_points: 0,
        special_points: 0,
        total_points: 0,
        exacts: 0,
        results: 0,
        last_modified: null,
        position: 0
      }));
    const byUser = Object.fromEntries(rows.map(row => [row.id, row]));

    all.predictions.forEach(prediction => {
      const row = byUser[prediction.user_id];
      const match = matchById[prediction.match_id];
      if (!row || !match) return;
      const points = matchPoints(prediction, match);
      row.match_points += points.points;
      row.exacts += points.exacts;
      row.results += points.results;
      row.last_modified = oldestModification(row.last_modified, prediction.updated_at);
    });

    all.specialPredictions.forEach(prediction => {
      const row = byUser[prediction.user_id];
      const result = all.specialResults;
      if (!row || !result) return;
      row.special_points += prediction.champion_team_id && prediction.champion_team_id === result.champion_team_id ? 5 : 0;
      row.special_points += prediction.runner_up_team_id && prediction.runner_up_team_id === result.runner_up_team_id ? 3 : 0;
      row.special_points += prediction.third_place_team_id && prediction.third_place_team_id === result.third_place_team_id ? 2 : 0;
      row.special_points += prediction.top_scorer_player_id && prediction.top_scorer_player_id === result.top_scorer_player_id ? 5 : 0;
      row.last_modified = oldestModification(row.last_modified, prediction.updated_at);
    });

    rows.forEach(row => {
      row.total_points = row.match_points + row.special_points;
      row.last_modified = row.last_modified || "9999-12-31T23:59:59Z";
    });
    rows.sort(compareNoAlpha);

    let position = 0;
    let previous = null;
    rows.forEach(row => {
      if (!previous || compareNoAlpha(row, previous) !== 0) position += 1;
      row.position = position;
      previous = row;
    });
    return rows;
  }

  function prizePlan(rows, participantCount) {
    const entryFee = Number(P.state.settings?.entry_fee || 0);
    const adminPct = Number(P.state.settings?.admin_percentage || 0);
    const pool = participantCount * entryFee;
    const adminFee = pool * adminPct / 100;
    const netPool = pool - adminFee;
    const percentages = {
      1: Number(P.state.settings?.first_place_percentage || 0),
      2: Number(P.state.settings?.second_place_percentage || 0),
      3: Number(P.state.settings?.third_place_percentage || 0)
    };
    const places = [1, 2, 3].map(place => {
      const winners = rows.filter(row => row.position === place);
      const prize = netPool * percentages[place] / 100;
      const each = winners.length ? prize / winners.length : 0;
      return { place, percentage: percentages[place], prize, each, winners };
    });
    return { pool, adminFee, netPool, places };
  }

  function renderPrizeSummary(title, prizes) {
    return `<section class="card p-5 prize-card">
      <div class="section-title"><div><h3>${P.esc(title)}</h3><p>Bolsa: <b>${P.money(prizes.pool)}</b> · Comisión admin: <b>${P.money(prizes.adminFee)}</b> · Bolsa neta: <b>${P.money(prizes.netPool)}</b></p></div></div>
      <div class="grid md:grid-cols-3 gap-3 mt-3">
        ${prizes.places.map(place => `<div class="prize-place"><h4>${place.place}° lugar · ${place.percentage}%</h4><p>Premio: <b>${P.money(place.prize)}</b></p>${place.winners.length ? place.winners.map(winner => `<p>${P.esc(winner.display_name)} recibe <b>${P.money(place.each)}</b></p>`).join("") : "<p class='text-slate-500'>Sin ganador por ahora.</p>"}</div>`).join("")}
      </div>
    </section>`;
  }

  function renderTable(rows, showPaid) {
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Pos</th><th>Usuario</th><th>Partidos</th><th>Especiales</th><th>Total</th><th>Exactos</th><th>Resultados</th>${showPaid ? "<th>Pago</th>" : ""}<th>Última mod.</th></tr></thead><tbody>
      ${rows.map(row => `<tr><td class="rank-pos">${row.position}</td><td>${P.esc(row.display_name)}</td><td>${row.match_points}</td><td>${row.special_points}</td><td><b>${row.total_points}</b></td><td>${row.exacts}</td><td>${row.results}</td>${showPaid ? `<td>${UI.badge(row.payment_status)}</td>` : ""}<td>${row.last_modified.startsWith("9999") ? "Sin pronósticos" : P.dt(row.last_modified)}</td></tr>`).join("")}
    </tbody></table></div>`;
  }

  async function renderRanking(officialOnly) {
    const rows = await calculateRows(officialOnly);
    const participantCount = rows.length;
    const prizes = prizePlan(rows, participantCount);
    UI.shell(`<section class="card p-5">
      <div class="section-title"><div><h2>Ranking ${officialOnly ? "oficial" : "general"}</h2><p>${officialOnly ? "Solo usuarios pagados participan por premios reales." : "Incluye a todos y simula premios como si todos hubieran pagado."}</p></div><span class="pill">Ranking denso: 1, 1, 2, 3</span></div>
    </section>
    ${renderPrizeSummary(officialOnly ? "Premios reales - Oficial" : "Premios simulados - General", prizes)}
    <section class="card p-5">${renderTable(rows, !officialOnly)}</section>`);
  }

  window.PronostixRankings = { calculateRows, prizePlan, renderPrizeSummary, renderRanking };
}());
EOF

cat > js/rules.js <<'EOF'
(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;

  function renderRules() {
    UI.shell(`<section class="card p-5">
      <h2 class="text-2xl font-black">Reglas y FAQ</h2>
      <div class="faq-grid mt-4">
        <article><h3>¿Cómo puntúan los partidos?</h3><p>Marcador exacto: <b>3 puntos</b>. Resultado correcto sin marcador exacto: <b>1 punto</b>. Incorrecto: <b>0 puntos</b>.</p></article>
        <article><h3>¿Cómo puntúan los especiales?</h3><p>Campeón: <b>5</b>. Subcampeón: <b>3</b>. Tercer lugar: <b>2</b>. Máximo goleador: <b>5</b>.</p></article>
        <article><h3>¿Cuándo se bloquean los partidos?</h3><p>Cada partido se bloquea <b>${P.lockMinutes()} minuto(s)</b> antes de iniciar, según configuración activa. Después del bloqueo no se puede modificar.</p></article>
        <article><h3>¿Cuándo se bloquean los especiales?</h3><p>Al iniciar el torneo. Los especiales bloqueados siguen visibles para el usuario.</p></article>
        <article><h3>¿Ranking general vs oficial?</h3><p>El general incluye a todos los registrados y simula premios como si todos hubieran pagado. El oficial incluye solo usuarios <b>PAID</b> y define premios reales.</p></article>
        <article><h3>¿Cómo se calculan premios?</h3><p>Bolsa = participantes × costo. Se resta comisión admin. La bolsa neta se reparte en 1°, 2° y 3°. Si hay empate en un lugar, ese premio se divide entre sus ganadores.</p></article>
        <article><h3>¿Cuáles son los desempates?</h3><p>Total, puntos especiales, exactos, resultados acertados y última modificación más antigua. <b>No</b> se usa orden alfabético.</p></article>
        <article><h3>¿Puedo ganar si no he pagado?</h3><p>Sales en ranking general, pero solo usuarios <b>PAID</b> participan en premios oficiales.</p></article>
      </div>
    </section>`);
  }

  window.PronostixRules = { renderRules };
}());
EOF

cat > js/admin.js <<'EOF'
(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;
  const Rankings = window.PronostixRankings;

  async function renderAdmin() {
    if (!P.state.profile?.is_admin) return UI.shell(UI.emptyState("No autorizado", "El acceso admin se controla desde la base de datos."));
    const [{ data: users, error: usersError }, tournamentData, officialRows] = await Promise.all([
      P.sb.from("profiles").select("*").order("created_at"),
      Data.getTournamentData(),
      Rankings.calculateRows(true)
    ]);
    if (usersError) P.toast(usersError.message, false);
    const { teams, players, matches } = tournamentData;
    const { data: specialResults, error: specialError } = await P.sb.from("special_results").select("*").eq("tournament_id", P.state.activeTournament?.id).maybeSingle();
    if (specialError) P.toast(specialError.message, false);
    const officialPrizes = Rankings.prizePlan(officialRows, officialRows.length);

    UI.shell(`${renderSettings()}
      ${renderPoolSummary(officialPrizes)}
      ${renderUsers(users || [])}
      ${renderMatchResults(matches)}
      ${renderSpecialResults(teams, players, specialResults)}
      ${renderCleanupInfo()}`);
  }

  function renderSettings() {
    const s = P.state.settings || {};
    return `<section class="card p-5"><div class="section-title"><div><h2>Panel administrador</h2><p>Admin real viene de <code>profiles.is_admin</code>, no del frontend.</p></div></div>
      <div class="grid md:grid-cols-2 gap-5 mt-4">
        <div><h3 class="font-black">Configuración económica y bloqueo</h3><p class="text-sm text-slate-500">Premios 1°+2°+3° deben sumar 100. Admin debe estar entre 0 y 100.</p>
          <div class="form-grid mt-2">
            <label>Costo inscripción<input id="entryFee" class="input" type="number" min="0" value="${s.entry_fee ?? 0}"></label>
            <label>% admin<input id="adminPct" class="input" type="number" min="0" max="100" value="${s.admin_percentage ?? 0}"></label>
            <label>% 1°<input id="firstPct" class="input" type="number" min="0" max="100" value="${s.first_place_percentage ?? 0}"></label>
            <label>% 2°<input id="secondPct" class="input" type="number" min="0" max="100" value="${s.second_place_percentage ?? 0}"></label>
            <label>% 3°<input id="thirdPct" class="input" type="number" min="0" max="100" value="${s.third_place_percentage ?? 0}"></label>
            <label>Bloqueo minutos<input id="lockMinutes" class="input" type="number" min="0" value="${s.lock_minutes_before_match ?? 1}"></label>
          </div>
          <button class="btn btn-primary mt-3" onclick="PronostixAdmin.saveSettings()">Guardar configuración</button>
        </div>
        <div><h3 class="font-black">Torneo activo</h3>
          <label>Seleccionar activo<select id="activeTournament" class="input mt-2">${P.state.tournaments.map(t => `<option value="${t.id}" ${t.is_active ? "selected" : ""}>${P.esc(t.name)}</option>`).join("")}</select></label>
          <label>Nombre del torneo activo<input id="tournamentName" class="input mt-2" value="${P.esc(P.state.activeTournament?.name || "")}"></label>
          <div class="flex gap-2 mt-3"><button class="btn btn-primary" onclick="PronostixAdmin.setActiveTournament()">Activar torneo</button><button class="btn btn-secondary" onclick="PronostixAdmin.saveTournamentName()">Guardar nombre</button></div>
        </div>
      </div>
    </section>`;
  }

  function renderPoolSummary(prizes) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Resumen oficial de bolsa</h3>
      <p class="mt-1">Bolsa: <b>${P.money(prizes.pool)}</b> · Comisión admin: <b>${P.money(prizes.adminFee)}</b> · Bolsa neta: <b>${P.money(prizes.netPool)}</b></p>
      ${Rankings.renderPrizeSummary("Premios calculados", prizes)}
    </section>`;
  }

  function renderUsers(users) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Usuarios y pagos</h3><div class="table-wrap mt-3"><table class="data-table"><thead><tr><th>Usuario</th><th>Email/Auth ID</th><th>Pago</th><th>Admin</th><th>Acción</th></tr></thead><tbody>
      ${users.map(user => `<tr><td>${P.esc(user.display_name)}<br><small>@${P.esc(user.username)}</small></td><td><small>${P.esc(user.id)}</small></td><td><select id="pay-${user.id}" class="input"><option value="UNPAID" ${user.payment_status === "UNPAID" ? "selected" : ""}>UNPAID</option><option value="PAID" ${user.payment_status === "PAID" ? "selected" : ""}>PAID</option></select></td><td>${user.is_admin ? "Sí" : "No"}</td><td><button class="btn btn-secondary" onclick="PronostixAdmin.savePayment('${user.id}')">Guardar</button></td></tr>`).join("")}
    </tbody></table></div></section>`;
  }

  function renderMatchResults(matches) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Resultados de partidos</h3><div class="match-list mt-3">
      ${matches.map(match => `<article class="admin-result-row"><b>${P.esc(match.home_team?.name)} vs ${P.esc(match.away_team?.name)}</b><input id="resultHome-${match.id}" class="input score-input" type="number" min="0" value="${match.home_score ?? ""}"><input id="resultAway-${match.id}" class="input score-input" type="number" min="0" value="${match.away_score ?? ""}"><select id="status-${match.id}" class="input"><option value="SCHEDULED" ${match.status === "SCHEDULED" ? "selected" : ""}>SCHEDULED</option><option value="FINISHED" ${match.status === "FINISHED" ? "selected" : ""}>FINISHED</option></select><button class="btn btn-primary" onclick="PronostixAdmin.saveMatchResult('${match.id}')">Guardar</button></article>`).join("")}
    </div></section>`;
  }

  function renderSpecialResults(teams, players, result) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Resultados especiales</h3><div class="grid md:grid-cols-4 gap-3 mt-3">
      <label>Campeón<select id="srChampion" class="input">${UI.optionList(teams, result?.champion_team_id, "Pendiente")}</select></label>
      <label>Subcampeón<select id="srRunner" class="input">${UI.optionList(teams, result?.runner_up_team_id, "Pendiente")}</select></label>
      <label>Tercer lugar<select id="srThird" class="input">${UI.optionList(teams, result?.third_place_team_id, "Pendiente")}</select></label>
      <label>Goleador<select id="srScorer" class="input">${UI.optionList(players, result?.top_scorer_player_id, "Pendiente")}</select></label>
    </div><button class="btn btn-primary mt-3" onclick="PronostixAdmin.saveSpecialResults()">Guardar resultados especiales</button></section>`;
  }

  function renderCleanupInfo() {
    return `<section class="card p-5"><h3 class="text-xl font-black">Limpieza de pruebas</h3><p>Para borrar usuarios/pronósticos/especiales dummy y conservar estructura, torneo, equipos y partidos base, ejecuta <code>sql/cleanup_test_data.sql</code> en Supabase SQL Editor. No uses service_role en frontend.</p></section>`;
  }

  function validateSettings(payload) {
    if (payload.entry_fee < 0 || payload.lock_minutes_before_match < 0) return "Costo y minutos de bloqueo no pueden ser negativos.";
    if (payload.admin_percentage < 0 || payload.admin_percentage > 100) return "La comisión admin debe estar entre 0 y 100%.";
    const prizeSum = payload.first_place_percentage + payload.second_place_percentage + payload.third_place_percentage;
    if (Math.abs(prizeSum - 100) > 0.001) return `Los porcentajes de premios deben sumar 100%. Actualmente suman ${prizeSum}%.`;
    return null;
  }

  async function saveSettings() {
    const payload = {
      id: 1,
      entry_fee: P.num(P.val("entryFee"), 0),
      admin_percentage: P.num(P.val("adminPct"), 0),
      first_place_percentage: P.num(P.val("firstPct"), 0),
      second_place_percentage: P.num(P.val("secondPct"), 0),
      third_place_percentage: P.num(P.val("thirdPct"), 0),
      lock_minutes_before_match: P.num(P.val("lockMinutes"), 1)
    };
    const validation = validateSettings(payload);
    if (validation) return P.toast(validation, false);
    const { error } = await P.sb.from("settings").upsert(payload);
    await Data.loadBase();
    P.toast(error ? error.message : "Configuración guardada.", !error);
    if (!error) renderAdmin();
  }

  async function setActiveTournament() {
    const id = P.val("activeTournament");
    if (!id) return P.toast("Selecciona un torneo.", false);
    await P.sb.from("tournaments").update({ is_active: false }).neq("id", id);
    const { error } = await P.sb.from("tournaments").update({ is_active: true }).eq("id", id);
    await Data.loadBase();
    P.toast(error ? error.message : "Torneo activado.", !error);
    if (!error) renderAdmin();
  }

  async function saveTournamentName() {
    const name = P.val("tournamentName");
    if (!name) return P.toast("El nombre del torneo no puede estar vacío.", false);
    const { error } = await P.sb.from("tournaments").update({ name }).eq("id", P.state.activeTournament.id);
    await Data.loadBase();
    P.toast(error ? error.message : "Nombre del torneo guardado.", !error);
    if (!error) renderAdmin();
  }

  async function savePayment(id) {
    const { error } = await P.sb.from("profiles").update({ payment_status: P.val(`pay-${id}`) }).eq("id", id);
    P.toast(error ? error.message : "Pago actualizado.", !error);
  }

  async function saveMatchResult(id) {
    const { error } = await P.sb.from("matches").update({ home_score: P.num(P.val(`resultHome-${id}`)), away_score: P.num(P.val(`resultAway-${id}`)), status: P.val(`status-${id}`) }).eq("id", id);
    P.toast(error ? error.message : "Resultado guardado.", !error);
  }

  async function saveSpecialResults() {
    const podium = [P.val("srChampion"), P.val("srRunner"), P.val("srThird")].filter(Boolean);
    if (new Set(podium).size !== podium.length) return P.toast("No repitas equipos en campeón/subcampeón/tercer lugar.", false);
    const payload = {
      tournament_id: P.state.activeTournament.id,
      champion_team_id: P.val("srChampion") || null,
      runner_up_team_id: P.val("srRunner") || null,
      third_place_team_id: P.val("srThird") || null,
      top_scorer_player_id: P.val("srScorer") || null
    };
    const { error } = await P.sb.from("special_results").upsert(payload, { onConflict: "tournament_id" });
    P.toast(error ? error.message : "Resultados especiales guardados.", !error);
  }

  window.PronostixAdmin = { renderAdmin, saveSettings, setActiveTournament, saveTournamentName, savePayment, saveMatchResult, saveSpecialResults };
}());
EOF

cat > css/styles.css <<'EOF'
:root{--brand:#1d4ed8;--brand2:#7c3aed;--ink:#0f172a;--muted:#64748b;--line:#dbe3ef;--ok:#047857;--danger:#b91c1c;--card:#ffffff}
*{box-sizing:border-box}body{margin:0;min-height:100vh;color:var(--ink);background:radial-gradient(circle at top left,#dbeafe 0,#f8fafc 34%,#eef2ff 100%);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.layout{width:min(1180px,calc(100% - 28px));margin-inline:auto}.page{padding:22px 0 38px}.site-header{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}.header-inner{display:flex;gap:16px;align-items:center;justify-content:space-between;padding:14px 0}.brand{font-weight:950;font-size:1.65rem;margin:0;background:linear-gradient(120deg,var(--brand),var(--brand2));-webkit-background-clip:text;background-clip:text;color:transparent}.user-line{margin:.15rem 0 0;color:var(--muted);font-size:.86rem}.nav{display:flex;flex-wrap:wrap;gap:7px}.nav-btn,.btn{border:0;border-radius:999px;padding:.68rem 1rem;font-weight:800;cursor:pointer;transition:.18s transform,.18s box-shadow,.18s background}.nav-btn{background:#eef2ff;color:#1e3a8a}.nav-btn.active,.nav-btn:hover{background:linear-gradient(120deg,var(--brand),var(--brand2));color:#fff;box-shadow:0 10px 24px rgba(37,99,235,.22)}.nav-btn.danger{background:#fee2e2;color:#991b1b}.btn:disabled,.nav-btn:disabled{opacity:.5;cursor:not-allowed}.btn:hover:not(:disabled),.nav-btn:hover:not(:disabled){transform:translateY(-1px)}.btn-primary{background:linear-gradient(120deg,var(--brand),var(--brand2));color:#fff;box-shadow:0 12px 28px rgba(37,99,235,.25)}.btn-secondary{background:#e2e8f0;color:#0f172a}.card{background:rgba(255,255,255,.94);border:1px solid rgba(148,163,184,.35);border-radius:24px;box-shadow:0 20px 55px rgba(15,23,42,.08)}.p-5{padding:1.25rem}.p-6{padding:1.5rem}.auth-page{min-height:100vh;display:grid;place-items:center;padding:20px}.auth-card{width:min(430px,100%);padding:30px}.auth-title{font-size:2.45rem;font-weight:950;text-align:center;margin:0;background:linear-gradient(120deg,var(--brand),var(--brand2));-webkit-background-clip:text;background-clip:text;color:transparent}.auth-subtitle{text-align:center;color:var(--muted);margin:8px 0 22px}.stack{display:grid;gap:12px}.input,input,select{width:100%;border:1px solid #cbd5e1;border-radius:14px;padding:.76rem .9rem;background:#fff;color:#0f172a;outline:none}.input:focus,input:focus,select:focus{border-color:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,.15)}label{font-weight:800;color:#334155;font-size:.92rem}label .input,label select,label input{margin-top:6px}.link-btn{border:0;background:transparent;color:var(--brand);font-weight:900;cursor:pointer}.hero{display:flex;gap:20px;justify-content:space-between;align-items:center;padding:30px}.hero h2{font-size:2rem;font-weight:950;margin:0}.hero p{color:var(--muted);margin:.3rem 0 0}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:.75rem;font-weight:950;color:var(--brand)}.hero-actions{display:flex;gap:10px;flex-wrap:wrap}.stat{padding:18px}.stat span{display:block;color:var(--muted);font-size:.86rem;font-weight:800}.stat b{display:block;font-size:1.4rem;margin-top:3px}.stat small{color:var(--muted)}.section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.section-title h2,.section-title h3{font-size:1.55rem;font-weight:950;margin:0}.section-title p{color:var(--muted);margin:.25rem 0 0}.pill{display:inline-flex;border-radius:999px;padding:.45rem .7rem;background:#eef2ff;color:#1e40af;font-weight:900;font-size:.78rem}.pill.ok{background:#dcfce7;color:#166534}.pill.danger{background:#fee2e2;color:#991b1b}.badge{display:inline-flex;border-radius:999px;padding:.25rem .55rem;font-size:.72rem;font-weight:950}.badge-paid{background:#dcfce7;color:#166534}.badge-pending{background:#fef3c7;color:#92400e}.match-list{display:grid;gap:12px}.match-card,.admin-result-row{display:flex;gap:14px;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:18px;background:#fff;padding:15px}.match-card.locked{background:#f8fafc}.match-main h3{font-weight:950;font-size:1.1rem;margin:0}.match-main h3 span{color:var(--muted);font-weight:700}.match-main p{margin:.25rem 0;color:var(--muted)}.lock-copy{font-weight:900!important;color:#1d4ed8!important}.locked .lock-copy{color:#b91c1c!important}.result-chip{display:inline-block;background:#e0f2fe;color:#075985;border-radius:999px;padding:.25rem .55rem;font-weight:900!important}.score-editor{display:flex;align-items:end;gap:8px;flex-wrap:wrap}.score-input{width:78px;text-align:center;font-weight:950}.dash{font-weight:950;font-size:1.4rem;margin-bottom:8px}.table-wrap{overflow:auto}.data-table{width:100%;border-collapse:collapse}.data-table th,.data-table td{padding:.82rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.data-table th{background:#f8fafc;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#475569}.rank-pos{font-size:1.2rem;font-weight:950;color:var(--brand)}.prize-card{border-color:#bfdbfe}.prize-place{border:1px solid var(--line);background:#f8fafc;border-radius:18px;padding:14px}.prize-place h4{font-weight:950;margin:0 0 6px}.faq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.faq-grid article{background:#f8fafc;border:1px solid var(--line);border-radius:18px;padding:16px}.faq-grid h3{font-weight:950;margin:0 0 6px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.toast{position:fixed;right:18px;bottom:18px;z-index:50;border-radius:18px;padding:14px 16px;color:#fff;font-weight:900;box-shadow:0 18px 48px rgba(15,23,42,.25)}.toast-ok{background:#059669}.toast-error{background:#dc2626}.hidden{display:none!important}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-3{margin-top:.75rem}.mt-4{margin-top:1rem}.gap-2{gap:.5rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}.gap-5{gap:1.25rem}.flex{display:flex}.grid{display:grid}.w-full{width:100%}.text-sm{font-size:.875rem}.text-xl{font-size:1.25rem}.text-2xl{font-size:1.5rem}.font-black{font-weight:950}.text-center{text-align:center}.text-slate-500{color:#64748b}.text-slate-600{color:#475569}.text-slate-700{color:#334155}.space-y-1>*+*{margin-top:.25rem}.list-decimal{list-style:decimal}.ml-5{margin-left:1.25rem}@media (min-width:768px){.md\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.md\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.md\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}}@media (max-width:760px){.header-inner,.hero,.match-card,.admin-result-row{align-items:stretch;flex-direction:column}.score-editor{align-items:stretch}.score-input{width:100%}.form-grid{grid-template-columns:1fr}}
EOF

