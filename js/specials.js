(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  async function renderSpecials() {
    const { teams, players, matches } = await Data.getTournamentData();
    const tid = P.state.activeTournament?.id;
    const { data: sp, error } = await P.sb.from("special_predictions").select("*").eq("user_id", P.state.session.user.id).eq("tournament_id", tid).maybeSingle();
    if (error) P.toast(error.message, false);
    const firstKickoff = matches[0]?.kickoff_at || P.state.activeTournament?.starts_at;
//    const locked = firstKickoff ? Date.now() >= new Date(firstKickoff).getTime() : false;
    const locked = false;	  
    UI.shell(`<section class="card p-5">
      <div class="section-title"><div><h2>Especiales</h2><p>Se bloquean al iniciar el torneo (${P.dt(firstKickoff)}). ${locked ? "Siguen visibles, no editables." : "Todavía puedes editar."}</p></div><span class="pill ${locked ? "danger" : "ok"}">${locked ? "Bloqueado" : "Abierto"}</span></div>
      <div class="grid md:grid-cols-2 gap-4 mt-4">
        <label>Campeón<select id="champion" class="input" ${locked ? "disabled" : ""}>${UI.optionList(teams, sp?.champion_team_id)}</select></label>
        <label>Subcampeón<select id="runner" class="input" ${locked ? "disabled" : ""}>${UI.optionList(teams, sp?.runner_up_team_id)}</select></label>
        <label>Tercer lugar<select id="third" class="input" ${locked ? "disabled" : ""}>${UI.optionList(teams, sp?.third_place_team_id)}</select></label>
        <label>Máximo goleador<select id="scorer" class="input" ${locked ? "disabled" : ""}>${UI.optionList(players, sp?.top_scorer_player_id)}</select></label>
      </div>
      <button class="btn btn-primary mt-4" onclick="PronostixSpecials.saveSpecials()" ${locked ? "disabled" : ""}>Guardar especiales</button>
    </section>`);
  }

  async function saveSpecials() {
    const champion = P.val("champion");
    const runner = P.val("runner");
    const third = P.val("third");
    const scorer = P.val("scorer");
    if (!champion || !runner || !third || !scorer) return P.toast("Captura campeón, subcampeón, tercer lugar y máximo goleador antes de guardar.", false);
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
