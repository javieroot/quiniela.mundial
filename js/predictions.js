(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;
  let visibleMatches = [];

  function isLocked(match) {
    return Date.now() >= new Date(match.kickoff_at).getTime() - (P.lockMinutes() * 60000);
  }

  function matchVenue(match) {
    const parts = [];
    if (match.group_name) parts.push(P.esc(match.group_name).toLowerCase().startsWith("grupo") ? P.esc(match.group_name) : `Grupo ${P.esc(match.group_name)}`);
    if (match.stadium) parts.push(P.esc(match.stadium));
    if (match.city) parts.push(P.esc(match.city));
    return parts.length ? `<p class="venue-copy">${parts.join(" · ")}</p>` : `<p class="venue-copy muted">Grupo/estadio/ciudad por confirmar</p>`;
  }

  async function renderPredictions() {
    const { matches } = await Data.getTournamentData();
    visibleMatches = matches;
    const { data: preds, error } = await P.sb.from("predictions").select("*").eq("user_id", P.state.session.user.id);
    if (error) P.toast(error.message, false);
    const byMatch = Object.fromEntries((preds || []).map(p => [p.match_id, p]));
    if (!matches.length) return UI.shell(UI.emptyState("Sin partidos", "Carga partidos desde el panel de administración o en SQL."));
    UI.shell(`<section class="card p-5">
      <div class="section-title"><div><h2>Pronósticos por partido</h2><p>Se bloquea ${P.lockMinutes()} minuto(s) antes de cada partido. Los bloqueados siguen visibles.</p></div><div class="admin-actions"><span class="pill">Tus pronósticos guardados se precargan</span><button class="btn btn-primary" onclick="PronostixPredictions.saveAllPredictions()">Guardar todo</button></div></div>
      <p class="text-sm text-slate-500 mt-2">Guardar todo recorre los partidos visibles, ignora vacíos o bloqueados y guarda únicamente marcadores completos.</p>
      <div class="match-list mt-3">${matches.map(match => renderMatch(match, byMatch[match.id])).join("")}</div>
    </section>`);
  }

  function renderMatch(match, pred) {
    const locked = isLocked(match);
    const result = match.status === "FINISHED" ? `<p class="result-chip">Resultado: ${match.home_score}-${match.away_score}</p>` : "";
    return `<article class="match-card ${locked ? "locked" : "open"}">
      <div class="match-main">
        <h3>${P.esc(match.home_team?.name)} <span>vs</span> ${P.esc(match.away_team?.name)}</h3>
        <p>${P.dt(match.kickoff_at)} · ${P.matchStatusLabel(match.status)} · ${locked ? "🔒 Bloqueado" : "🟢 Abierto"}</p>
        ${matchVenue(match)}
        <p class="lock-copy">Se bloquea ${P.lockMinutes()} minuto(s) antes del partido.</p>
        ${result}
      </div>
      <div class="score-editor">
        <label>${P.esc(match.home_team?.code || match.home_team?.name || "Local")}<input id="home-${match.id}" class="input score-input" type="number" min="0" value="${pred?.home_score ?? ""}" ${locked ? "disabled" : ""}></label>
        <span class="dash">-</span>
        <label>${P.esc(match.away_team?.code || match.away_team?.name || "Visita")}<input id="away-${match.id}" class="input score-input" type="number" min="0" value="${pred?.away_score ?? ""}" ${locked ? "disabled" : ""}></label>
        <button class="btn btn-primary" onclick="PronostixPredictions.savePrediction('${match.id}')" ${locked ? "disabled" : ""}>Guardar</button>
      </div>
    </article>`;
  }

  function predictionPayload(matchId, updatedAt = new Date().toISOString()) {
    return {
      user_id: P.state.session.user.id,
      match_id: matchId,
      home_score: P.num(P.val(`home-${matchId}`)),
      away_score: P.num(P.val(`away-${matchId}`)),
      updated_at: updatedAt
    };
  }

  function hasScoreValue(matchId, side) {
    return P.val(`${side}-${matchId}`) !== "";
  }

  async function savePrediction(matchId) {
    const payload = predictionPayload(matchId);
    if (payload.home_score == null || payload.away_score == null) return P.toast("Captura ambos marcadores.", false);
    const { error } = await P.sb.from("predictions").upsert(payload, { onConflict: "user_id,match_id" });
    P.toast(error ? error.message : "Pronóstico guardado.", !error);
  }

  async function saveAllPredictions() {
    const updatedAt = new Date().toISOString();
    const payloads = [];
    let omitted = 0;

    for (const match of visibleMatches) {
      if (isLocked(match)) {
        omitted += 1;
        continue;
      }

      const hasHome = hasScoreValue(match.id, "home");
      const hasAway = hasScoreValue(match.id, "away");
      if (!hasHome && !hasAway) {
        omitted += 1;
        continue;
      }
      if (hasHome !== hasAway) return P.toast("Hay partidos incompletos. Captura ambos marcadores o deja ambos campos vacíos.", false);

      payloads.push(predictionPayload(match.id, updatedAt));
    }

    if (!payloads.length) return P.toast(`Se guardaron 0 pronósticos. ${omitted} partidos se omitieron por estar vacíos o bloqueados.`);
    const { error } = await P.sb.from("predictions").upsert(payloads, { onConflict: "user_id,match_id" });
    P.toast(error ? error.message : `Se guardaron ${payloads.length} pronósticos. ${omitted} partidos se omitieron por estar vacíos o bloqueados.`, !error);
  }

  window.PronostixPredictions = { renderPredictions, savePrediction, saveAllPredictions, isLocked };
}());
