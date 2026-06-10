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
