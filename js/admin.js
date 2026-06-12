(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;
  const Rankings = window.PronostixRankings;
  const DUMMY_USER_IDS = [
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000003",
    "00000000-0000-0000-0000-000000000004",
    "00000000-0000-0000-0000-000000000005",
    "00000000-0000-0000-0000-000000000006"
  ];

  const isRoot = () => P.state.profile?.role === "ROOT";
  const ELIMINATION_ORDER = ["Dieciseisavos", "Octavos", "Cuartos", "Semifinales", "Tercer Lugar", "Final"];

  function progressPercent(done, total) {
    return total ? Math.round((done / total) * 100) : 0;
  }

  function normalizeStageName(value) {
    const text = String(value || "").trim();
    return text || "Sin grupo/fase";
  }

  function isGroupStageName(name) {
    return /^grupo\s+/i.test(name) || /^[a-z0-9]$/i.test(name);
  }

  function displayStageName(name) {
    if (/^grupo\s+/i.test(name)) return name.replace(/^grupo\s+/i, "Grupo ");
    if (/^[a-z0-9]$/i.test(name)) return `Grupo ${name.toUpperCase()}`;
    return name;
  }

  function stageSortValue(stage) {
    if (stage.type === "group") return `0-${stage.label}`;
    const order = ELIMINATION_ORDER.findIndex(label => label.toLowerCase() === stage.label.toLowerCase());
    return `1-${order === -1 ? 99 : order}-${stage.label}`;
  }

  function storageKey(area, key) {
    return `pronostix:${P.state.activeTournament?.id || "global"}:${area}:${key}`;
  }

  function sectionOpen(area, key, fallback = true) {
    const value = window.localStorage?.getItem(storageKey(area, key));
    if (value == null) return fallback;
    return value === "open";
  }

  function saveCollapseState(details) {
    if (!details?.dataset?.collapseKey) return;
    window.localStorage?.setItem(details.dataset.collapseKey, details.open ? "open" : "closed");
  }

  function groupMatches(matches, metricFn = () => false) {
    const groups = new Map();
    matches.forEach(match => {
      const rawName = normalizeStageName(match.group_name);
      const type = isGroupStageName(rawName) ? "group" : "round";
      const label = displayStageName(rawName);
      const key = `${type}:${label}`;
      if (!groups.has(key)) groups.set(key, { key, type, label, matches: [], completed: 0 });
      const group = groups.get(key);
      group.matches.push(match);
      if (metricFn(match)) group.completed += 1;
    });
    return [...groups.values()].sort((a, b) => stageSortValue(a).localeCompare(stageSortValue(b), "es", { numeric: true }));
  }

  function renderProgressSummary(title, done, total, extra = []) {
    const percent = progressPercent(done, total);
    return `<section class="progress-summary mt-3" aria-label="${P.esc(title)}">
      <div><span>${P.esc(title)}:</span><b>${done} / ${total}</b></div>
      ${extra.map(item => `<div><span>${P.esc(item.label)}:</span><b>${P.esc(item.value)}</b></div>`).join("")}
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>
      <strong>${percent}%</strong>
    </section>`;
  }

  async function renderAdmin() {
    if (!P.state.profile?.is_admin) return UI.shell(UI.emptyState("No autorizado", "El acceso de administración se controla desde la base de datos."));
    const [{ data: users, error: usersError }, tournamentData, officialRows, systemSnapshot] = await Promise.all([
      P.sb.from("profiles").select("*").order("created_at"),
      Data.getTournamentData(),
      Rankings.calculateRows(true),
      getSystemSnapshot()
    ]);
    if (usersError) P.toast(usersError.message, false);
    const { teams, players, matches } = tournamentData;
    const { data: specialResults, error: specialError } = await P.sb.from("special_results").select("*").eq("tournament_id", P.state.activeTournament?.id).maybeSingle();
    if (specialError) P.toast(specialError.message, false);
    const officialPrizes = Rankings.prizePlan(officialRows, officialRows.length);

    UI.shell(`${renderQuickNav()}
      ${adminDetails("estado", "Estado del sistema", renderSystemStatus(systemSnapshot), true)}
      ${adminDetails("configuracion", "Configuración del torneo", `${renderSettings()}${renderAutomationSettings()}${renderPoolSummary(officialPrizes)}`, true)}
      ${adminDetails("usuarios", "Usuarios, pagos y roles", `${renderUsers(users || [])}${renderPrivilegeInfo()}`, false)}
      ${adminDetails("resultados", "Resultados de partidos", renderMatchResults(matches), false)}
      ${adminDetails("especiales", "Resultados especiales", renderSpecialResults(teams, players, specialResults), false)}
      ${adminDetails("mantenimiento", "Mantenimiento", renderMaintenance(systemSnapshot), false)}
      ${adminDetails("ayuda", "Ayuda técnica y carga de datos", `${renderDataLoadInfo()}${renderRolesMigrationInfo()}`, false)}`);
  }

  function renderQuickNav() {
    return `<section class="card p-5 admin-quick-nav"><h2 class="text-xl font-black">Administración</h2><p class="text-slate-600 mt-1">Menú rápido para operar el torneo sin buscar entre toda la información.</p><div class="admin-nav-actions mt-3"><a class="btn btn-secondary" href="#estado">Estado</a><a class="btn btn-secondary" href="#configuracion">Configuración</a><a class="btn btn-secondary" href="#usuarios">Usuarios</a><a class="btn btn-secondary" href="#resultados">Resultados</a><a class="btn btn-secondary" href="#especiales">Especiales</a><a class="btn btn-secondary" href="#mantenimiento">Mantenimiento</a><a class="btn btn-secondary" href="#ayuda">Ayuda</a></div></section>`;
  }

  function adminDetails(id, title, content, open = false) {
    return `<details id="${id}" class="admin-section card" ${open ? "open" : ""}><summary>${P.esc(title)}</summary><div class="admin-section-body">${content}</div></details>`;
  }

  function renderSettings() {
    const s = P.state.settings || {};
    return `<section class="admin-block"><div class="section-title"><div><h2>Configuración económica y bloqueo</h2><p>Define inscripción, comisión visible solo en Administración, premios y bloqueo de capturas.</p></div><button class="btn btn-primary" onclick="PronostixAdmin.saveSettings()">Guardar configuración</button></div>
      <div class="grid md:grid-cols-2 gap-5 mt-4">
        <div><h3 class="font-black">Premios del torneo</h3><p class="text-sm text-slate-500">Configuración esperada: inscripción 200 MXN, comisión admin 10%, premios 50% / 25% / 15%. La suma total debe ser 100%.</p>
          <div class="form-grid mt-2">
            <label>Costo de inscripción<input id="entryFee" class="input" type="number" min="0" value="${s.entry_fee ?? 0}"></label>
            <label>% comisión admin<input id="adminPct" class="input" type="number" min="0" max="100" value="${s.admin_percentage ?? 0}"></label>
            <label>% 1° lugar<input id="firstPct" class="input" type="number" min="0" max="100" value="${s.first_place_percentage ?? 0}"></label>
            <label>% 2° lugar<input id="secondPct" class="input" type="number" min="0" max="100" value="${s.second_place_percentage ?? 0}"></label>
            <label>% 3° lugar<input id="thirdPct" class="input" type="number" min="0" max="100" value="${s.third_place_percentage ?? 0}"></label>
            <label>Minutos de bloqueo<input id="lockMinutes" class="input" type="number" min="0" value="${s.lock_minutes_before_match ?? 1}"></label>
          </div>
          <label class="setting-check mt-3"><input id="specialsForceUnlock" type="checkbox" ${s.specials_force_unlock ? "checked" : ""}> <span><b>Desbloqueo manual de especiales</b><small>Permite editar especiales aunque el torneo ya haya iniciado. Utilizar únicamente en situaciones excepcionales.</small></span></label>
          <button class="btn btn-primary mt-3" onclick="PronostixAdmin.saveSettings()">Guardar configuración</button>
        </div>
        <div><h3 class="font-black">Torneo activo</h3><p class="text-sm text-slate-500">Úsalo solo si necesitas cambiar qué torneo ve la aplicación.</p>
          <label>Seleccionar torneo activo<select id="activeTournament" class="input mt-2">${P.state.tournaments.map(t => `<option value="${t.id}" ${t.is_active ? "selected" : ""}>${P.esc(t.name)}</option>`).join("")}</select></label>
          <label>Nombre del torneo activo<input id="tournamentName" class="input mt-2" value="${P.esc(P.state.activeTournament?.name || "")}"></label>
          <div class="flex gap-2 mt-3"><button class="btn btn-primary" onclick="PronostixAdmin.setActiveTournament()">Activar torneo</button><button class="btn btn-secondary" onclick="PronostixAdmin.saveTournamentName()">Guardar nombre</button></div>
        </div>
      </div>
    </section>`;
  }

  function renderAutomationSettings() {
    const s = P.state.settings || {};
    return `<section class="admin-block"><h3 class="text-xl font-black">Preparación para API futura</h3>
      <p class="text-slate-600 mt-1">La captura manual sigue siendo la fuente principal. La API automática NO está implementada; estos campos solo preparan una integración futura.</p>
      <div class="grid md:grid-cols-2 gap-4 mt-3">
        <label><input id="resultsApiEnabled" type="checkbox" ${s.results_api_enabled ? "checked" : ""}> Preparar API futura de resultados de partidos</label>
        <label>Proveedor/API partidos<input id="resultsApiProvider" class="input" value="${P.esc(s.results_api_provider || "")}" placeholder="Ej. football-data, API-Football"></label>
        <label><input id="specialsApiEnabled" type="checkbox" ${s.special_results_api_enabled ? "checked" : ""}> Preparar automatización de especiales</label>
        <label>Proveedor/API especiales<input id="specialsApiProvider" class="input" value="${P.esc(s.special_results_api_provider || "")}" placeholder="Opcional a futuro"></label>
      </div>
      <div class="flex gap-2 mt-3"><button class="btn btn-secondary" onclick="PronostixAdmin.saveAutomationSettings()">Guardar preparación API</button><button class="btn btn-secondary" disabled>Sincronizar resultados (próximamente)</button></div>
      <details class="technical-details mt-3"><summary>Ver información técnica</summary><p class="text-sm text-slate-500 mt-2">Si falla este guardado, ejecuta primero <code>sql/migrations/20260610_match_metadata_and_api_flags.sql</code>.</p></details>
    </section>`;
  }

  function renderPrivilegeInfo() {
    return `<section class="admin-block"><h3 class="text-xl font-black">Control de privilegios</h3>
      <p class="text-slate-600 mt-1">ROOT puede otorgar o revocar administración. ADMIN opera pagos, configuración y resultados, pero no debe elevar privilegios.</p>
      <div class="grid md:grid-cols-2 gap-4 mt-3">
        <article class="prize-place"><h4>Un usuario ROOT puede:</h4><ul class="list-decimal ml-5 text-sm text-slate-700"><li>Otorgar permisos de administrador.</li><li>Revocar permisos de administrador.</li><li>Designar o reemplazar administradores operativos.</li></ul></article>
        <article class="prize-place"><h4>Administradores operativos</h4><p class="text-sm text-slate-700">Pueden gestionar el torneo y sus participantes, pero no pueden crear, modificar ni eliminar usuarios ROOT.</p></article>
      </div>
      <details class="technical-details mt-3"><summary>Ver información técnica</summary><p class="text-sm text-slate-500 mt-2">Los permisos se validan en SQL con <code>profiles.role</code> y <code>auth.uid()</code>; el frontend solo muestra los controles permitidos.</p></details>
    </section>`;
  }

  function renderRolesMigrationInfo() {
    return `<section class="admin-block"><h3 class="text-xl font-black">Ayuda de migraciones y mantenimiento</h3>
      <p class="text-slate-600 mt-1">Usa esta guía cuando prepares una base existente para roles administrativos y limpiezas seguras.</p>
      <div class="grid md:grid-cols-4 gap-3 mt-3">
        <article class="prize-place"><h4>Para qué sirve</h4><p class="text-sm">Agrega roles ROOT/ADMIN/USER y procedimientos seguros para limpiar pruebas.</p></article>
        <article class="prize-place"><h4>Cuándo ejecutarla</h4><p class="text-sm">Después de tener la estructura base y antes de usar mantenimiento o control de roles.</p></article>
        <article class="prize-place"><h4>Qué agrega</h4><p class="text-sm">Roles, validaciones de permisos y tres acciones de limpieza desde Administración.</p></article>
        <article class="prize-place"><h4>Qué NO hace</h4><p class="text-sm">No crea usuarios, no carga seeds, no borra equipos, partidos, jugadores, torneo ni configuración.</p></article>
      </div>
      <details class="technical-details mt-3"><summary>Ver información técnica</summary><p class="text-sm text-slate-500 mt-2">Archivo: <code>sql/migrations/20260610_roles_and_admin_maintenance.sql</code>. Funciones: <code>set_profile_role()</code>, <code>reset_user_entries()</code>, <code>reset_tournament_results()</code> y <code>reset_full_test()</code>.</p></details>
    </section>`;
  }

  function renderPoolSummary(prizes) {
    return `<section class="admin-block"><h3 class="text-xl font-black">Resumen oficial de bolsa</h3>
      <p class="mt-1">Bolsa: <b>${P.money(prizes.pool)}</b> · Comisión admin: <b>${P.money(prizes.adminFee)}</b> · Bolsa neta: <b>${P.money(prizes.netPool)}</b></p>
      ${Rankings.renderPrizeSummary("Premios calculados", prizes, true)}
    </section>`;
  }

  function userRole(user) {
    if (user.role) return user.role;
    return user.is_admin ? "ADMIN" : "USER";
  }

  function roleControl(user) {
    const currentRole = userRole(user);
    if (!isRoot()) return `<span class="pill">${P.esc(currentRole)}</span>`;
    return `<div class="admin-actions"><select id="role-${user.id}" class="input role-select"><option value="USER" ${currentRole === "USER" ? "selected" : ""}>USER</option><option value="ADMIN" ${currentRole === "ADMIN" ? "selected" : ""}>ADMIN</option><option value="ROOT" ${currentRole === "ROOT" ? "selected" : ""}>ROOT</option></select><button class="btn btn-secondary" onclick="PronostixAdmin.saveRole('${user.id}')">Guardar rol</button></div>`;
  }

  function renderUsers(users) {
    return `<section class="admin-block"><div class="section-title"><div><h3>Usuarios, pagos y roles</h3><p>Operación diaria: confirmar pagos y, si eres ROOT, ajustar roles.</p></div></div><div class="table-wrap mt-3"><table class="data-table admin-users-table"><thead><tr><th>Usuario</th><th>ID de usuario</th><th>Pago</th><th>Rol</th><th>Administrador</th><th>Acciones</th></tr></thead><tbody>
      ${users.map(user => `<tr><td>${UI.userChip(user, true)}</td><td><small>${P.esc(user.id)}</small></td><td><select id="pay-${user.id}" class="input"><option value="UNPAID" ${user.payment_status === "UNPAID" ? "selected" : ""}>NO PAGADO</option><option value="PAID" ${user.payment_status === "PAID" ? "selected" : ""}>PAGADO</option></select></td><td>${roleControl(user)}</td><td>${user.is_admin ? "Sí" : "No"}</td><td><div class="admin-actions"><button class="btn btn-secondary" onclick="PronostixAdmin.savePayment('${user.id}')">Guardar pago</button></div></td></tr>`).join("")}
    </tbody></table></div></section>`;
  }

  function hasMatchScore(match) {
    return match.home_score != null && match.away_score != null;
  }

  function renderResultRow(match) {
    return `<article class="admin-result-row"><div><b>${P.esc(match.home_team?.name)} vs ${P.esc(match.away_team?.name)}</b><p class="text-sm text-slate-500">${P.esc(match.group_name || "Fase por confirmar")} · ${P.esc(match.stadium || "Estadio por confirmar")} · ${P.esc(match.city || "Ciudad por confirmar")}</p></div><input id="resultHome-${match.id}" class="input score-input" type="number" min="0" value="${match.home_score ?? ""}"><input id="resultAway-${match.id}" class="input score-input" type="number" min="0" value="${match.away_score ?? ""}"><select id="status-${match.id}" class="input"><option value="SCHEDULED" ${match.status === "SCHEDULED" ? "selected" : ""}>Programado</option><option value="FINISHED" ${match.status === "FINISHED" ? "selected" : ""}>Finalizado</option></select><button class="btn btn-primary" onclick="PronostixAdmin.saveMatchResult('${match.id}')">Guardar resultado</button></article>`;
  }

  function renderResultGroup(group) {
    const key = storageKey("admin-results", group.key);
    const percent = progressPercent(group.completed, group.matches.length);
    return `<details class="match-group" data-collapse-key="${P.esc(key)}" ${sectionOpen("admin-results", group.key) ? "open" : ""} ontoggle="PronostixAdmin.saveCollapseState(this)">
      <summary><span>${P.esc(group.label)} <small>(${group.completed}/${group.matches.length} con resultado)</small></span><span class="group-progress">${percent}%</span></summary>
      <div class="match-list match-group-body">${group.matches.map(renderResultRow).join("")}</div>
    </details>`;
  }

  function renderResultGroups(groups) {
    const groupStage = groups.filter(group => group.type === "group");
    const rounds = groups.filter(group => group.type !== "group");
    return `${groupStage.length ? `<h3 class="group-section-heading">Fase de grupos</h3>${groupStage.map(renderResultGroup).join("")}` : ""}
      ${rounds.length ? `<h3 class="group-section-heading">Eliminatorias / fases</h3>${rounds.map(renderResultGroup).join("")}` : ""}`;
  }

  function renderMatchResults(matches) {
    const captured = matches.filter(hasMatchScore).length;
    const finished = matches.filter(match => match.status === "FINISHED").length;
    const pending = Math.max(0, matches.length - finished);
    const groups = groupMatches(matches, hasMatchScore);
    return `<section class="admin-block"><h3 class="text-xl font-black">Resultados de partidos</h3><p class="text-slate-600 mt-1">Captura final del marcador y marca el partido como finalizado. La captura manual es la fuente principal.</p>
      ${renderProgressSummary("Resultados capturados", captured, matches.length, [{ label: "Partidos finalizados", value: finished }, { label: "Partidos pendientes", value: pending }])}
      <div class="match-groups mt-3">${renderResultGroups(groups)}</div></section>`;
  }

  function renderSpecialResults(teams, players, result) {
    return `<section class="admin-block"><h3 class="text-xl font-black">Resultados especiales</h3><p class="text-slate-600 mt-1">Captura campeón, subcampeón, tercer lugar y goleador cuando sean oficiales. La automatización no está implementada.</p><div class="grid md:grid-cols-4 gap-3 mt-3">
      <label>Campeón<select id="srChampion" class="input">${UI.optionList(teams, result?.champion_team_id, "Pendiente")}</select></label>
      <label>Subcampeón<select id="srRunner" class="input">${UI.optionList(teams, result?.runner_up_team_id, "Pendiente")}</select></label>
      <label>Tercer lugar<select id="srThird" class="input">${UI.optionList(teams, result?.third_place_team_id, "Pendiente")}</select></label>
      <label>Goleador<select id="srScorer" class="input">${UI.optionList(players, result?.top_scorer_player_id, "Pendiente")}</select></label>
    </div><button class="btn btn-primary mt-3" onclick="PronostixAdmin.saveSpecialResults()">Guardar resultados especiales</button></section>`;
  }

  function statusCard(title, value, okText, dangerText) {
    const unknown = value === null || value === undefined;
    const ok = !unknown && Number(value || 0) === 0;
    const copy = unknown ? "No se pudo verificar" : (ok ? okText : dangerText);
    return `<article class="maintenance-status ${unknown ? "unknown" : ok ? "ok" : "danger"}"><span>${P.esc(title)}</span><b>${unknown ? "—" : value}</b><small>${P.esc(copy)}</small></article>`;
  }

  function metricCard(title, value, helper = "") {
    const unknown = value === null || value === undefined;
    return `<article class="maintenance-status ${unknown ? "unknown" : "ok"}"><span>${P.esc(title)}</span><b>${unknown ? "—" : value}</b><small>${unknown ? "No se pudo verificar" : P.esc(helper)}</small></article>`;
  }

  async function countRows(tableName, applyFilters = query => query) {
    const query = applyFilters(P.sb.from(tableName).select("*", { count: "exact", head: true }));
    const { count, error } = await query;
    if (error) {
      console.warn(`No se pudo verificar ${tableName}:`, error.message);
      return null;
    }
    return count || 0;
  }

  async function getSystemSnapshot() {
    const tid = P.state.activeTournament?.id;
    const [users, paidUsers, predictions, specialPredictions, specialResults, finishedMatches, scoredMatches, dummyProfiles, matchesLoaded, playersLoaded] = await Promise.all([
      countRows("profiles"),
      countRows("profiles", query => query.eq("payment_status", "PAID")),
      countRows("predictions"),
      countRows("special_predictions"),
      tid ? countRows("special_results", query => query.eq("tournament_id", tid)) : 0,
      tid ? countRows("matches", query => query.eq("tournament_id", tid).eq("status", "FINISHED")) : 0,
      tid ? countRows("matches", query => query.eq("tournament_id", tid).not("home_score", "is", null).not("away_score", "is", null)) : 0,
      countRows("profiles", query => query.in("id", DUMMY_USER_IDS)),
      tid ? countRows("matches", query => query.eq("tournament_id", tid)) : countRows("matches"),
      countRows("players")
    ]);
    const results = (specialResults === null && finishedMatches === null && scoredMatches === null) ? null : (specialResults || 0) + Math.max(finishedMatches || 0, scoredMatches || 0);
    return {
      users,
      paidUsers,
      dummyProfiles,
      matchesLoaded,
      playersLoaded,
      predictions,
      specialPredictions,
      specialResults,
      matchResults: (finishedMatches === null && scoredMatches === null) ? null : Math.max(finishedMatches || 0, scoredMatches || 0),
      results,
      isClean: [predictions, specialPredictions, results, dummyProfiles].every(value => value !== null && Number(value || 0) === 0)
    };
  }

  function renderSystemStatus(snapshot = {}) {
    return `<section class="admin-block"><div class="section-title"><div><h3>Estado del sistema</h3><p>Vista rápida para confirmar si la base está lista para producción.</p></div><span class="pill ${snapshot.isClean ? "ok" : "danger"}">${snapshot.isClean ? "Sin capturas de prueba" : "Revisar antes de liberar"}</span></div>
      <div class="maintenance-grid mt-3">
        ${metricCard("Usuarios registrados", snapshot.users, "Total de perfiles registrados.")}
        ${metricCard("Usuarios pagados", snapshot.paidUsers, "Participan en ranking oficial.")}
        ${metricCard("Usuarios dummy", snapshot.dummyProfiles, "Debe ser 0 en producción.")}
        ${metricCard("Partidos cargados", snapshot.matchesLoaded, "Calendario disponible.")}
        ${metricCard("Jugadores cargados", snapshot.playersLoaded, "Candidatos para especiales.")}
        ${metricCard("Pronósticos capturados", snapshot.predictions, "Capturas de partidos de usuarios.")}
        ${metricCard("Especiales capturados", snapshot.specialPredictions, "Capturas especiales de usuarios.")}
        ${metricCard("Resultados capturados", snapshot.results, "Partidos con marcador y resultados especiales.")}
      </div>
    </section>`;
  }

  function renderMaintenance(snapshot = {}) {
    return `<section class="admin-block"><div class="section-title"><div><h3>Mantenimiento del torneo</h3><p>Verificación previa y limpiezas seguras para cerrar pruebas antes de producción.</p></div><span class="pill ${snapshot.isClean ? "ok" : "danger"}">${snapshot.isClean ? "Listo para producción" : "Revisar datos"}</span></div>
      <p class="text-slate-600 mt-1">Cada acción pide confirmación y conserva estructura, torneo, configuración, equipos, jugadores y calendario.</p>
      <div class="maintenance-grid mt-3">
        ${statusCard("Usuarios dummy", snapshot.dummyProfiles, "Sin perfiles dummy conocidos.", "Hay perfiles dummy conocidos por borrar con cleanup_test_data.sql.")}
        ${statusCard("Pronósticos", snapshot.predictions, "Sin pronósticos cargados.", "Hay pronósticos cargados; confirma si son pruebas o producción.")}
        ${statusCard("Especiales usuarios", snapshot.specialPredictions, "Sin especiales de usuarios.", "Hay especiales de usuarios cargados; confirma si son pruebas o producción.")}
        ${statusCard("Resultados", snapshot.results, "Sin resultados capturados.", "Hay resultados capturados; confirma si son pruebas o producción.")}
      </div>
      <div class="grid md:grid-cols-3 gap-4 mt-3">
        <article class="prize-place">
          <h4>Limpiar capturas de usuarios</h4>
          <button class="btn btn-secondary mt-2" onclick="PronostixAdmin.resetUserEntries()">Limpiar capturas de usuarios</button>
          <p class="text-sm text-slate-700 mt-3">Úsalo si quieres borrar pronósticos y especiales capturados por usuarios sin tocar resultados oficiales.</p>
          <p class="text-sm"><b>Borra SOLO:</b> pronósticos de partidos y especiales de usuarios.</p>
          <p class="text-sm"><b>Conserva:</b> resultados, usuarios, pagos, roles, torneo, settings, equipos, calendario y jugadores.</p>
          <details class="technical-details mt-2"><summary>Detalle técnico</summary><p class="text-sm"><code>reset_user_entries()</code></p></details>
        </article>
        <article class="prize-place">
          <h4>Limpiar resultados del torneo</h4>
          <button class="btn btn-secondary mt-2" onclick="PronostixAdmin.resetTournamentResults()">Limpiar resultados del torneo</button>
          <p class="text-sm text-slate-700 mt-3">Úsalo si necesitas recapturar resultados sin borrar pronósticos ni especiales de usuarios.</p>
          <p class="text-sm"><b>Borra/limpia SOLO:</b> resultados especiales y marcadores/estado de partidos.</p>
          <p class="text-sm"><b>Conserva:</b> pronósticos, especiales de usuarios, usuarios, pagos, roles, torneo, settings, equipos, calendario y jugadores.</p>
          <details class="technical-details mt-2"><summary>Detalle técnico</summary><p class="text-sm"><code>reset_tournament_results()</code></p></details>
        </article>
        <article class="prize-place">
          <h4>Reiniciar prueba completa</h4>
          <button class="btn btn-secondary mt-2" onclick="PronostixAdmin.resetFullTest()">Reiniciar prueba completa</button>
          <p class="text-sm text-slate-700 mt-3">Úsalo antes de producción para dejar el Mundial cargado, pero sin capturas ni resultados de prueba.</p>
          <p class="text-sm"><b>Borra/limpia:</b> pronósticos, especiales de usuarios, resultados especiales y marcadores/estado de partidos.</p>
          <p class="text-sm"><b>Conserva:</b> admin ROOT, javieroot ADMIN, usuarios, pagos, roles, torneo, settings, equipos, calendario y jugadores.</p>
          <details class="technical-details mt-2"><summary>Detalle técnico</summary><p class="text-sm"><code>reset_full_test()</code></p></details>
        </article>
      </div>
      <details class="technical-details mt-3"><summary>Ver información técnica</summary><p class="text-sm text-slate-500 mt-2">Las limpiezas se validan en SQL con la sesión autenticada y rol ROOT/ADMIN. Requieren <code>sql/migrations/20260610_roles_and_admin_maintenance.sql</code>.</p></details>
    </section>`;
  }

  function renderDataLoadInfo() {
    return `<section class="admin-block"><h3 class="text-xl font-black">Carga de datos base y liberación</h3>
      <p class="text-slate-600 mt-1">El frontend no ejecuta SQL. Corre los scripts desde Supabase SQL Editor y valida después de cada carga.</p>
      <ol class="list-decimal ml-5 mt-2 text-slate-700"><li><code>sql/seed_worldcup_2026.sql</code></li><li><code>sql/seed_worldcup_2026_players_candidates.sql</code></li><li><code>sql/validate_worldcup_2026_seed.sql</code></li><li><code>sql/cleanup_test_data.sql</code> si existen usuarios dummy</li><li><code>reset_full_test()</code> si necesitas borrar capturas y resultados de prueba</li><li><code>sql/validate_pre_production_clean.sql</code></li></ol>
      <div class="grid md:grid-cols-4 gap-3 mt-3"><article class="prize-place"><h4>Schema</h4><p class="text-sm">Crea estructura desde cero. Úsalo solo para bases nuevas.</p></article><article class="prize-place"><h4>Migraciones</h4><p class="text-sm">Actualizan una base existente sin recrearla.</p></article><article class="prize-place"><h4>Seeds</h4><p class="text-sm">Cargan calendario y jugadores.</p></article><article class="prize-place"><h4>Reset</h4><p class="text-sm">Limpia pruebas sin perder calendario ni configuración.</p></article></div>
    </section>`;
  }

  function validateSettings(payload) {
    if (payload.entry_fee < 0 || payload.lock_minutes_before_match < 0) return "Costo y minutos de bloqueo no pueden ser negativos.";
    if (payload.admin_percentage < 0 || payload.admin_percentage > 100) return "La comisión admin debe estar entre 0 y 100%.";
    const totalDistribution = payload.admin_percentage + payload.first_place_percentage + payload.second_place_percentage + payload.third_place_percentage;
    if (Math.abs(totalDistribution - 100) > 0.001) return `Comisión admin + premios deben sumar 100%. Actualmente suman ${totalDistribution}%.`;
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
      lock_minutes_before_match: P.num(P.val("lockMinutes"), 1),
      specials_force_unlock: document.getElementById("specialsForceUnlock")?.checked || false
    };
    const validation = validateSettings(payload);
    if (validation) return P.toast(validation, false);
    const { error } = await P.sb.from("settings").upsert(payload);
    await Data.loadBase();
    P.toast(error ? `${error.message}. Si falta columna de desbloqueo, ejecuta la migración de especiales.` : "Configuración guardada.", !error);
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

  async function saveMatchResult(id) {
    const { error } = await P.sb.from("matches").update({ home_score: P.num(P.val(`resultHome-${id}`)), away_score: P.num(P.val(`resultAway-${id}`)), status: P.val(`status-${id}`) }).eq("id", id);
    P.toast(error ? error.message : "Resultado guardado.", !error);
  }

  async function resetUserEntries() {
    if (window.prompt("Escribe LIMPIAR CAPTURAS para confirmar.") !== "LIMPIAR CAPTURAS") return P.toast("Operación cancelada.", false);
    const { error } = await P.sb.rpc("reset_user_entries");
    await Data.loadBase();
    P.toast(error ? error.message : "Capturas de usuarios limpiadas.", !error);
    if (!error) renderAdmin();
  }

  async function resetTournamentResults() {
    if (window.prompt("Escribe LIMPIAR RESULTADOS para confirmar.") !== "LIMPIAR RESULTADOS") return P.toast("Operación cancelada.", false);
    const { error } = await P.sb.rpc("reset_tournament_results");
    await Data.loadBase();
    P.toast(error ? error.message : "Resultados del torneo limpiados.", !error);
    if (!error) renderAdmin();
  }

  async function resetFullTest() {
    if (window.prompt("Escribe REINICIAR TODO para confirmar.") !== "REINICIAR TODO") return P.toast("Operación cancelada.", false);
    const { error } = await P.sb.rpc("reset_full_test");
    await Data.loadBase();
    P.toast(error ? error.message : "Prueba completa reiniciada.", !error);
    if (!error) renderAdmin();
  }

  async function saveSpecialResults() {
    const champion = P.val("srChampion");
    const runner = P.val("srRunner");
    const third = P.val("srThird");
    const scorer = P.val("srScorer");
    if (!champion || !runner || !third || !scorer) return P.toast("Captura campeón, subcampeón, tercer lugar y goleador antes de guardar resultados especiales.", false);
    const podium = [champion, runner, third];
    if (new Set(podium).size !== podium.length) return P.toast("No repitas equipos en campeón/subcampeón/tercer lugar.", false);
    const payload = {
      tournament_id: P.state.activeTournament.id,
      champion_team_id: champion,
      runner_up_team_id: runner,
      third_place_team_id: third,
      top_scorer_player_id: scorer
    };
    const { error } = await P.sb.from("special_results").upsert(payload, { onConflict: "tournament_id" });
    P.toast(error ? error.message : "Resultados especiales guardados.", !error);
  }

  window.PronostixAdmin = { renderAdmin, saveSettings, saveAutomationSettings, setActiveTournament, saveTournamentName, savePayment, saveRole, saveMatchResult, saveSpecialResults, resetUserEntries, resetTournamentResults, resetFullTest, saveCollapseState };
}());
