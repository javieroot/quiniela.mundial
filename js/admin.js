(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;
  const Rankings = window.PronostixRankings;

  async function renderAdmin() {
    if (!P.state.profile?.is_admin) return UI.shell(UI.emptyState("No autorizado", "El acceso de administración se controla desde la base de datos."));
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
      ${renderPrivilegeInfo()}
      ${renderRolesMigrationInfo()}
      ${renderAutomationSettings()}
      ${renderPoolSummary(officialPrizes)}
      ${renderUsers(users || [])}
      ${renderMatchResults(matches)}
      ${renderSpecialResults(teams, players, specialResults)}
      ${renderMaintenance()}
      ${renderDataLoadInfo()}`);
  }

  function renderSettings() {
    const s = P.state.settings || {};
    return `<section class="card p-5"><div class="section-title"><div><h2>Panel de administración</h2><p>El permiso real viene de <code>profiles.is_admin</code>, no del frontend.</p></div></div>
      <div class="grid md:grid-cols-2 gap-5 mt-4">
        <div><h3 class="font-black">Configuración económica y bloqueo</h3><p class="text-sm text-slate-500">Premios 1°+2°+3° deben sumar 100. Comisión admin debe estar entre 0 y 100.</p>
          <div class="form-grid mt-2">
            <label>Costo de inscripción<input id="entryFee" class="input" type="number" min="0" value="${s.entry_fee ?? 0}"></label>
            <label>% comisión admin<input id="adminPct" class="input" type="number" min="0" max="100" value="${s.admin_percentage ?? 0}"></label>
            <label>% 1° lugar<input id="firstPct" class="input" type="number" min="0" max="100" value="${s.first_place_percentage ?? 0}"></label>
            <label>% 2° lugar<input id="secondPct" class="input" type="number" min="0" max="100" value="${s.second_place_percentage ?? 0}"></label>
            <label>% 3° lugar<input id="thirdPct" class="input" type="number" min="0" max="100" value="${s.third_place_percentage ?? 0}"></label>
            <label>Minutos de bloqueo<input id="lockMinutes" class="input" type="number" min="0" value="${s.lock_minutes_before_match ?? 1}"></label>
          </div>
          <button class="btn btn-primary mt-3" onclick="PronostixAdmin.saveSettings()">Guardar configuración</button>
        </div>
        <div><h3 class="font-black">Torneo activo</h3>
          <label>Seleccionar torneo activo<select id="activeTournament" class="input mt-2">${P.state.tournaments.map(t => `<option value="${t.id}" ${t.is_active ? "selected" : ""}>${P.esc(t.name)}</option>`).join("")}</select></label>
          <label>Nombre del torneo activo<input id="tournamentName" class="input mt-2" value="${P.esc(P.state.activeTournament?.name || "")}"></label>
          <div class="flex gap-2 mt-3"><button class="btn btn-primary" onclick="PronostixAdmin.setActiveTournament()">Activar torneo</button><button class="btn btn-secondary" onclick="PronostixAdmin.saveTournamentName()">Guardar nombre</button></div>
        </div>
      </div>
    </section>`;
  }

  function renderAutomationSettings() {
    const s = P.state.settings || {};
    return `<section class="card p-5"><h3 class="text-xl font-black">Preparación para API futura</h3>
      <p class="text-slate-600 mt-1">La captura manual sigue siendo la fuente principal. La API automática NO está implementada; estos campos solo preparan una integración futura.</p>
      <div class="grid md:grid-cols-2 gap-4 mt-3">
        <label><input id="resultsApiEnabled" type="checkbox" ${s.results_api_enabled ? "checked" : ""}> Preparar API futura de resultados de partidos</label>
        <label>Proveedor/API partidos<input id="resultsApiProvider" class="input" value="${P.esc(s.results_api_provider || "")}" placeholder="Ej. football-data, API-Football"></label>
        <label><input id="specialsApiEnabled" type="checkbox" ${s.special_results_api_enabled ? "checked" : ""}> Preparar automatización de especiales</label>
        <label>Proveedor/API especiales<input id="specialsApiProvider" class="input" value="${P.esc(s.special_results_api_provider || "")}" placeholder="Opcional a futuro"></label>
      </div>
      <div class="flex gap-2 mt-3"><button class="btn btn-secondary" onclick="PronostixAdmin.saveAutomationSettings()">Guardar preparación API</button><button class="btn btn-secondary" disabled>Sincronizar resultados (próximamente)</button></div>
      <p class="text-sm text-slate-500 mt-2">Si falla este guardado, ejecuta primero la migración <code>sql/migrations/20260610_match_metadata_and_api_flags.sql</code>.</p>
    </section>`;
  }

  function renderPrivilegeInfo() {
    return `<section class="card p-5"><h3 class="text-xl font-black">Control de privilegios</h3>
      <p class="text-slate-600 mt-1">Los permisos administrativos son gestionados exclusivamente por usuarios con perfil ROOT.</p>
      <div class="grid md:grid-cols-2 gap-4 mt-3">
        <article class="prize-place"><h4>Un usuario ROOT puede:</h4><ul class="list-decimal ml-5 text-sm text-slate-700"><li>Otorgar permisos de administrador.</li><li>Revocar permisos de administrador.</li><li>Designar o reemplazar administradores operativos.</li></ul></article>
        <article class="prize-place"><h4>Administradores operativos</h4><p class="text-sm text-slate-700">Pueden gestionar el torneo y sus participantes, pero no pueden crear, modificar ni eliminar usuarios ROOT.</p></article>
      </div>
    </section>`;
  }

  function renderRolesMigrationInfo() {
    return `<section class="card p-5"><h3 class="text-xl font-black">Migración de roles y mantenimiento</h3>
      <p class="text-slate-600 mt-1"><code>sql/migrations/20260610_roles_and_admin_maintenance.sql</code> prepara la base para controlar privilegios y ejecutar limpiezas seguras desde RPC.</p>
      <div class="grid md:grid-cols-4 gap-3 mt-3">
        <article class="prize-place"><h4>Para qué sirve</h4><p class="text-sm">Agrega roles ROOT/ADMIN/USER y procedimientos de mantenimiento del torneo.</p></article>
        <article class="prize-place"><h4>Cuándo ejecutarla</h4><p class="text-sm">Después de tener la estructura base y antes de usar mantenimiento o control de roles.</p></article>
        <article class="prize-place"><h4>Qué agrega</h4><p class="text-sm">Columna <code>profiles.role</code>, helpers de permisos, <code>set_profile_role()</code>, <code>reset_test_data()</code> y <code>reset_tournament_results()</code>.</p></article>
        <article class="prize-place"><h4>Qué NO hace</h4><p class="text-sm">No crea usuarios, no carga seeds, no borra equipos, partidos, jugadores, torneo ni configuración.</p></article>
      </div>
      <p class="text-sm text-slate-500 mt-3">Los botones de reset no son la seguridad principal: las RPC validan <code>auth.uid()</code> y rol ROOT/ADMIN dentro de SQL. Sus borrados son globales por diseño para reiniciar pruebas/resultados del torneo.</p>
    </section>`;
  }

  function renderPoolSummary(prizes) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Resumen oficial de bolsa</h3>
      <p class="mt-1">Bolsa: <b>${P.money(prizes.pool)}</b> · Comisión admin: <b>${P.money(prizes.adminFee)}</b> · Bolsa neta: <b>${P.money(prizes.netPool)}</b></p>
      ${Rankings.renderPrizeSummary("Premios calculados", prizes, true)}
    </section>`;
  }

  function userRole(user) {
    if (user.role) return user.role;
    return user.is_admin ? "ADMIN" : "USER";
  }

  function renderUsers(users) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Usuarios y pagos</h3><div class="table-wrap mt-3"><table class="data-table"><thead><tr><th>Usuario</th><th>ID de usuario</th><th>Pago</th><th>Rol</th><th>Administrador</th><th>Acción</th></tr></thead><tbody>
      ${users.map(user => `<tr><td>${UI.userChip(user, true)}</td><td><small>${P.esc(user.id)}</small></td><td><select id="pay-${user.id}" class="input"><option value="UNPAID" ${user.payment_status === "UNPAID" ? "selected" : ""}>NO PAGADO</option><option value="PAID" ${user.payment_status === "PAID" ? "selected" : ""}>PAGADO</option></select></td><td><span class="pill">${P.esc(userRole(user))}</span></td><td>${user.is_admin ? "Sí" : "No"}</td><td><button class="btn btn-secondary" onclick="PronostixAdmin.savePayment('${user.id}')">Guardar</button></td></tr>`).join("")}
    </tbody></table></div></section>`;
  }

  function renderMatchResults(matches) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Resultados de partidos</h3><p class="text-slate-600 mt-1">La captura manual es la fuente principal de resultados. La API automática queda para una fase futura.</p><div class="match-list mt-3">
      ${matches.map(match => `<article class="admin-result-row"><div><b>${P.esc(match.home_team?.name)} vs ${P.esc(match.away_team?.name)}</b><p class="text-sm text-slate-500">${P.esc(match.group_name || "Grupo por confirmar")} · ${P.esc(match.stadium || "Estadio por confirmar")} · ${P.esc(match.city || "Ciudad por confirmar")}</p></div><input id="resultHome-${match.id}" class="input score-input" type="number" min="0" value="${match.home_score ?? ""}"><input id="resultAway-${match.id}" class="input score-input" type="number" min="0" value="${match.away_score ?? ""}"><select id="status-${match.id}" class="input"><option value="SCHEDULED" ${match.status === "SCHEDULED" ? "selected" : ""}>Programado</option><option value="FINISHED" ${match.status === "FINISHED" ? "selected" : ""}>Finalizado</option></select><button class="btn btn-primary" onclick="PronostixAdmin.saveMatchResult('${match.id}')">Guardar resultado</button></article>`).join("")}
    </div></section>`;
  }

  function renderSpecialResults(teams, players, result) {
    return `<section class="card p-5"><h3 class="text-xl font-black">Resultados especiales</h3><p class="text-slate-600 mt-1">Captura manual activa. La automatización de especiales queda preparada para después, pero no está implementada.</p><div class="grid md:grid-cols-4 gap-3 mt-3">
      <label>Campeón<select id="srChampion" class="input">${UI.optionList(teams, result?.champion_team_id, "Pendiente")}</select></label>
      <label>Subcampeón<select id="srRunner" class="input">${UI.optionList(teams, result?.runner_up_team_id, "Pendiente")}</select></label>
      <label>Tercer lugar<select id="srThird" class="input">${UI.optionList(teams, result?.third_place_team_id, "Pendiente")}</select></label>
      <label>Goleador<select id="srScorer" class="input">${UI.optionList(players, result?.top_scorer_player_id, "Pendiente")}</select></label>
    </div><button class="btn btn-primary mt-3" onclick="PronostixAdmin.saveSpecialResults()">Guardar resultados especiales</button></section>`;
  }

  function renderMaintenance() {
    return `<section class="card p-5"><h3 class="text-xl font-black">Mantenimiento del torneo</h3>
      <p class="text-slate-600 mt-1">Herramientas seguras para pruebas y operación. Requieren ejecutar la migración <code>sql/migrations/20260610_roles_and_admin_maintenance.sql</code>.</p>
      <p class="text-sm text-slate-500 mt-2">Las limpiezas se validan en SQL con <code>auth.uid()</code> y rol ROOT/ADMIN. No dependen únicamente del botón del frontend. Los borrados indicados son globales por diseño.</p>
      <div class="grid md:grid-cols-2 gap-4 mt-3">
        <article class="prize-place"><h4>Limpiar datos de prueba</h4><p class="text-sm text-slate-700">Limpia datos de prueba y deja el torneo listo para iniciar desde cero.</p><p class="text-sm"><b>Borra:</b> pronósticos, especiales capturados, resultados especiales y audit logs si existen.</p><p class="text-sm"><b>Conserva:</b> torneos, configuración, equipos, partidos, jugadores, perfiles reales y auth.users.</p><button class="btn btn-secondary mt-3" onclick="PronostixAdmin.resetTestData()">Limpiar datos de prueba</button></article>
        <article class="prize-place"><h4>Limpiar resultados</h4><p class="text-sm text-slate-700">Limpia únicamente resultados capturados para volver a simular el torneo sin borrar pronósticos.</p><p class="text-sm"><b>Borra:</b> resultados especiales.</p><p class="text-sm"><b>Conserva:</b> pronósticos, especiales, usuarios, perfiles, equipos, partidos, jugadores y configuración.</p><button class="btn btn-secondary mt-3" onclick="PronostixAdmin.resetTournamentResults()">Limpiar resultados</button></article>
      </div>
    </section>`;
  }

  function renderDataLoadInfo() {
    return `<section class="card p-5"><h3 class="text-xl font-black">Carga de datos base</h3>
      <p class="text-slate-600 mt-1">El frontend no ejecuta SQL. Corre estos scripts desde Supabase SQL Editor en este orden:</p>
      <ol class="list-decimal ml-5 mt-2 text-slate-700"><li><code>sql/seed_worldcup_2026.sql</code></li><li><code>sql/seed_worldcup_2026_players_candidates.sql</code></li><li><code>sql/validate_worldcup_2026_seed.sql</code></li></ol>
      <div class="grid md:grid-cols-4 gap-3 mt-3"><article class="prize-place"><h4>Schema</h4><p class="text-sm">Crea estructura desde cero. Úsalo solo para bases nuevas.</p></article><article class="prize-place"><h4>Migraciones</h4><p class="text-sm">Actualizan una base existente sin recrearla.</p></article><article class="prize-place"><h4>Seeds</h4><p class="text-sm">Cargan datos iniciales o de producción.</p></article><article class="prize-place"><h4>Reset</h4><p class="text-sm">Limpia pruebas sin perder calendario.</p></article></div>
    </section>`;
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

  async function saveAutomationSettings() {
    const payload = {
      id: 1,
      results_api_enabled: document.getElementById("resultsApiEnabled")?.checked || false,
      results_api_provider: P.val("resultsApiProvider") || null,
      special_results_api_enabled: document.getElementById("specialsApiEnabled")?.checked || false,
      special_results_api_provider: P.val("specialsApiProvider") || null
    };
    const { error } = await P.sb.from("settings").upsert(payload);
    await Data.loadBase();
    P.toast(error ? `${error.message}. Si falta columna, ejecuta la migración de API.` : "Preparación API guardada.", !error);
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

  async function resetTestData() {
    if (window.prompt('Escribe REINICIAR PRUEBAS para confirmar.') !== 'REINICIAR PRUEBAS') return P.toast('Operación cancelada.', false);
    const { error } = await P.sb.rpc('reset_test_data');
    await Data.loadBase();
    P.toast(error ? error.message : 'Datos de prueba limpiados.', !error);
    if (!error) renderAdmin();
  }

  async function resetTournamentResults() {
    if (window.prompt('Escribe LIMPIAR RESULTADOS para confirmar.') !== 'LIMPIAR RESULTADOS') return P.toast('Operación cancelada.', false);
    const { error } = await P.sb.rpc('reset_tournament_results');
    await Data.loadBase();
    P.toast(error ? error.message : 'Resultados limpiados.', !error);
    if (!error) renderAdmin();
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

  window.PronostixAdmin = { renderAdmin, saveSettings, saveAutomationSettings, setActiveTournament, saveTournamentName, savePayment, saveMatchResult, saveSpecialResults, resetTestData, resetTournamentResults };
}());
