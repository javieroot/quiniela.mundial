(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  function matchPoints(prediction, match) {
    if (
      match.status !== "FINISHED"
      || prediction.home_score == null
      || prediction.away_score == null
      || match.home_score == null
      || match.away_score == null
    ) {
      return { points: 0, exacts: 0, results: 0 };
    }

    if (prediction.home_score === match.home_score && prediction.away_score === match.away_score) {
      return { points: 3, exacts: 1, results: 0 };
    }

    const sign = (a, b) => Math.sign(Number(a) - Number(b));

    if (sign(prediction.home_score, prediction.away_score) === sign(match.home_score, match.away_score)) {
      return { points: 1, exacts: 0, results: 1 };
    }

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

  function renderPrizeSummary(title, prizes, adminView = false) {
    return `<section class="card p-5 prize-card">
      <div class="section-title"><div><h3>${P.esc(title)}</h3><p>Bolsa de premios: <b>${P.money(prizes.netPool)}</b>${adminView ? ` · Bolsa total: <b>${P.money(prizes.pool)}</b> · Comisión admin: <b>${P.money(prizes.adminFee)}</b>` : ""}</p></div></div>
      <div class="grid md:grid-cols-3 gap-3 mt-3">
        ${prizes.places.map(place => `<div class="prize-place"><h4>${place.place}° lugar</h4><p>Monto total: <b>${P.money(place.prize)}</b>${adminView ? ` <small>(${place.percentage}%)</small>` : ""}</p>${place.winners.length ? place.winners.map(winner => `<p>${UI.userChip(winner, false)} recibe <b>${P.money(place.each)}</b></p>`).join("") : "<p class='text-slate-500'>Sin ganador por ahora.</p>"}</div>`).join("")}
      </div>
    </section>`;
  }

  function positionIcon(position) {
    return position === 1 ? "🏆" : position === 2 ? "🥈" : position === 3 ? "🥉" : "";
  }

  function renderTable(rows, showPaid) {
    return `<div class="table-wrap">
      <table class="data-table ranking-table">
        <thead>
          <tr>
            <th>Posición</th>
            <th>Usuario</th>
            <th>Partidos</th>
            <th>Especiales</th>
            <th>Total</th>
            <th>Exactos</th>
            <th>Resultados</th>
            ${showPaid ? "<th>Pago</th>" : ""}
            <th>Última modificación</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr class="${row.position <= 3 ? `top-${row.position}` : ""}">
            <td class="rank-pos">${positionIcon(row.position)} ${row.position}</td>
            <td>${UI.userChip(row, false)}</td>
            <td>${row.match_points}</td>
            <td>${row.special_points}</td>
            <td><b>${row.total_points}</b></td>
            <td>${row.exacts}</td>
            <td>${row.results}</td>
            ${showPaid ? `<td>${UI.badge(row.payment_status)}</td>` : ""}
            <td>${row.last_modified.startsWith("9999") ? "Sin pronósticos" : P.dt(row.last_modified)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
  }

  async function renderRanking(officialOnly) {
    const rows = await calculateRows(officialOnly);
    const participantCount = rows.length;
    const prizes = prizePlan(rows, participantCount);

    UI.shell(`<section class="card p-5">
      <div class="section-title">
        <div>
          <h2>🏆 Ranking ${officialOnly ? "oficial" : "general"}</h2>
          <p>${officialOnly ? "Solo usuarios con pago confirmado participan por premios reales." : "Incluye a todos y simula premios como si todos hubieran pagado."}</p>
        </div>
        <span class="pill">Los empates comparten posición y premio.</span>
      </div>
    </section>

    ${renderPrizeSummary(officialOnly ? "Premios reales - Oficial" : "Premios simulados - General", prizes)}

    <section class="card p-5">
      ${renderTable(rows, !officialOnly)}
    </section>`);
  }

  window.PronostixRankings = {
    calculateRows,
    prizePlan,
    renderPrizeSummary,
    renderRanking
  };
}());
