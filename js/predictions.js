(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;
  let visibleMatches = [];

  const ELIMINATION_ORDER = ["Dieciseisavos", "Octavos", "Cuartos", "Semifinales", "Tercer Lugar", "Final"];

  function isLocked(match) {
    return Date.now() >= new Date(match.kickoff_at).getTime() - (P.lockMinutes() * 60000);
  }

  function matchVenue(match) {
    const parts = [];
    if (match.group_name) {
      const stage = String(match.group_name).trim();
      parts.push(/^grupo\s+/i.test(stage) ? P.esc(stage) : /^[a-z0-9]$/i.test(stage) ? `Grupo ${P.esc(stage.toUpperCase())}` : P.esc(stage));
    }
    if (match.stadium) parts.push(P.esc(match.stadium));
    if (match.city) parts.push(P.esc(match.city));
    return parts.length ? `<p class="venue-copy">${parts.join(" · ")}</p>` : `<p class="venue-copy muted">Grupo/estadio/ciudad por confirmar</p>`;
  }

  function isPredictionCaptured(pred) {
    return pred?.home_score != null && pred?.away_score != null;
  }

  function progressPercent(done, total) {
    return total ? Math.round((done / total) * 100) : 0;
  }

  function renderProgressSummary(done, total) {
    const percent = progressPercent(done, total);
    return `<section class="progress-summary mt-3" aria-label="Avance de pronósticos">
      <div><span>Pronósticos capturados:</span><b>${done} / ${total}</b></div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>
      <strong>${percent}%</strong>
    </section>`;
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

  function groupMatches(matches, byMatch) {
    const groups = new Map();
    matches.forEach(match => {
      const rawName = normalizeStageName(match.group_name);
      const type = isGroupStageName(rawName) ? "group" : "round";
      const label = displayStageName(rawName);
      const key = `${type}:${label}`;
      if (!groups.has(key)) groups.set(key, { key, type, label, matches: [], captured: 0 });
      const group = groups.get(key);
      group.matches.push(match);
      if (isPredictionCaptured(byMatch[match.id])) group.captured += 1;
    });
    return [...groups.values()].sort((a, b) => stageSortValue(a).localeCompare(stageSortValue(b), "es", { numeric: true }));
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

  function renderMatchGroup(group, byMatch) {
    const key = storageKey("predictions", group.key);
    const percent = progressPercent(group.captured, group.matches.length);
    return `<details class="match-group" data-collapse-key="${P.esc(key)}" ${sectionOpen("predictions", group.key) ? "open" : ""} ontoggle="PronostixPredictions.saveCollapseState(this)">
      <summary><span>${P.esc(group.label)} <small>(${group.captured}/${group.matches.length} capturados)</small></span><span class="group-progress">${percent}%</span></summary>
      <div class="match-list match-group-body">${group.matches.map(match => renderMatch(match, byMatch[match.id])).join("")}</div>
    </details>`;
  }

  function renderStageGroups(groups, byMatch) {
    const groupStage = groups.filter(group => group.type === "group");
    const rounds = groups.filter(group => group.type !== "group");
    return `${groupStage.length ? `<h3 class="group-section-heading">Fase de grupos</h3>${groupStage.map(group => renderMatchGroup(group, byMatch)).join("")}` : ""}
      ${rounds.length ? `<h3 class="group-section-heading">Eliminatorias / fases</h3>${rounds.map(group => renderMatchGroup(group, byMatch)).join("")}` : ""}`;
  }

  async function renderPredictions() {
    const { matches } = await Data.getTournamentData();
    visibleMatches = matches;
    const { data: preds, error } = await P.sb.from("predictions").select("*").eq("user_id", P.state.session.user.id);
    if (error) P.toast(error.message, false);
    const byMatch = Object.fromEntries((preds || []).map(p => [p.match_id, p]));
    const captured = matches.filter(match => isPredictionCaptured(byMatch[match.id])).length;
    const groups = groupMatches(matches, byMatch);
    if (!matches.length) return UI.shell(UI.emptyState("Sin partidos", "Carga partidos desde el panel de administración o en SQL."));
    UI.shell(`<section class="card p-5">
      <div class="section-title"><div><h2>Pronósticos por partido</h2><p>Se bloquea ${P.lockMinutes()} minuto(s) antes de cada partido. Los bloqueados siguen visibles.</p></div><div class="admin-actions"><span class="pill">Tus pronósticos guardados se precargan</span><button class="btn btn-primary" onclick="PronostixPredictions.saveAllPredictions()">Guardar todo</button></div></div>
      ${renderProgressSummary(captured, matches.length)}
      <p class="text-sm text-slate-500 mt-2">Guardar todo recorre los partidos visibles, ignora vacíos o bloqueados y guarda únicamente marcadores completos.</p>
      <div class="match-groups mt-3">${renderStageGroups(groups, byMatch)}</div>
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

  window.PronostixPredictions = { renderPredictions, savePrediction, saveAllPredictions, isLocked, saveCollapseState };
}());
