(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  function playerLabel(player, teamsById) {
    const teamName = teamsById[player.team_id]?.name;
    return teamName ? `${player.name} — ${teamName}` : player.name;
  }

  function hasId(items, id) {
    return items.some(item => item.id === id);
  }

  async function renderSpecials() {
    const { teams, players, matches } = await Data.getTournamentData();
    const teamsById = Object.fromEntries(teams.map(team => [team.id, team]));
    const tid = P.state.activeTournament?.id;
    const { data: sp, error } = await P.sb.from("special_predictions").select("*").eq("user_id", P.state.session.user.id).eq("tournament_id", tid).maybeSingle();
    if (error) P.toast(error.message, false);
    const firstKickoff = matches[0]?.kickoff_at || P.state.activeTournament?.starts_at;
    const forceUnlocked = Boolean(P.state.settings?.specials_force_unlock);
    const autoLocked = firstKickoff ? Date.now() >= new Date(firstKickoff).getTime() : false;
    const locked = autoLocked && !forceUnlocked;
    const lockCopy = forceUnlocked
      ? "Desbloqueo manual activo desde Administración. Puedes editar de forma excepcional."
      : `Se bloquean al iniciar el torneo (${P.dt(firstKickoff)}). ${locked ? "Siguen visibles, no editables." : "Todavía puedes editar."}`;
    UI.shell(`<section class="card p-5">
      <div class="section-title"><div><h2>Especiales</h2><p>${lockCopy}</p></div><span class="pill ${locked ? "danger" : "ok"}">${locked ? "Bloqueado" : forceUnlocked ? "Desbloqueo manual" : "Abierto"}</span></div>
      <div class="grid md:grid-cols-2 gap-4 mt-4">
        ${UI.autocompleteField({ id: "champion", label: "Campeón", items: teams, selected: sp?.champion_team_id, placeholder: "Ej. México", disabled: locked })}
        ${UI.autocompleteField({ id: "runner", label: "Subcampeón", items: teams, selected: sp?.runner_up_team_id, placeholder: "Ej. Francia", disabled: locked })}
        ${UI.autocompleteField({ id: "third", label: "Tercer lugar", items: teams, selected: sp?.third_place_team_id, placeholder: "Ej. Inglaterra", disabled: locked })}
        ${UI.autocompleteField({ id: "scorer", label: "Máximo goleador", items: players, selected: sp?.top_scorer_player_id, placeholder: "Ej. Mbappé, Kane, Haaland", labelFn: player => playerLabel(player, teamsById), disabled: locked, help: "Escribe el jugador y selecciona una opción con país." })}
      </div>
      <button class="btn btn-primary mt-4" onclick="PronostixSpecials.saveSpecials()" ${locked ? "disabled" : ""}>Guardar especiales</button>
    </section>`);
  }

  async function saveSpecials() {
    const { matches } = await Data.getTournamentData();
    const firstKickoff = matches[0]?.kickoff_at || P.state.activeTournament?.starts_at;
    const forceUnlocked = Boolean(P.state.settings?.specials_force_unlock);
    const locked = firstKickoff ? Date.now() >= new Date(firstKickoff).getTime() && !forceUnlocked : false;
    if (locked) return P.toast("Los especiales están bloqueados porque el torneo ya inició.", false);
    const { teams, players } = await Data.getTournamentData();
    const champion = P.val("champion");
    const runner = P.val("runner");
    const third = P.val("third");
    const scorer = P.val("scorer");
    if (!champion || !runner || !third || !scorer) return P.toast("Selecciona campeón, subcampeón, tercer lugar y máximo goleador desde la lista antes de guardar.", false);
    if (![champion, runner, third].every(id => hasId(teams, id)) || !hasId(players, scorer)) return P.toast("Selecciona únicamente equipos y goleadores existentes de la lista.", false);
    const podium = [champion, runner, third];
    if (new Set(podium).size !== podium.length) return P.toast("No puedes repetir equipo entre campeón, subcampeón y tercer lugar.", false);
    const payload = {
      user_id: P.state.session.user.id,
      tournament_id: P.state.activeTournament.id,
      champion_team_id: champion,
      runner_up_team_id: runner,
      third_place_team_id: third,
      top_scorer_player_id: scorer,
      updated_at: new Date().toISOString()
    };
    const { error } = await P.sb.from("special_predictions").upsert(payload, { onConflict: "user_id,tournament_id" });
    P.toast(error ? error.message : "Especiales guardados.", !error);
  }

  window.PronostixSpecials = { renderSpecials, saveSpecials };
}());
