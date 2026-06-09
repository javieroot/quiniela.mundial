async function loadPredictions() {
  const { data: matches, error: matchError } = await client.from("matches").select("*").order("match_date");
  if (matchError) return alert(matchError.message);

  const { data: predictions, error: predictionError } = await client.from("predictions").select("*").eq("user_id", currentUser.id);
  if (predictionError) return alert(predictionError.message);

  const predictionMap = {};
  (predictions || []).forEach(p => { predictionMap[p.match_id] = p; });

  setContent(`
    <h2 class="text-xl font-bold mb-4">Mis Pronósticos</h2>
    ${!(matches || []).length ? `<p>No hay partidos cargados todavía.</p>` : ""}
    ${(matches || []).map(match => {
      const prediction = predictionMap[match.id];
      const locked = isMatchLocked(match.match_date);
      return `
        <div class="border rounded-xl p-4 mb-3">
          <div class="font-bold">${match.home_team} vs ${match.away_team}</div>
          <div class="text-sm text-slate-500 mb-3">${formatDateTime(match.match_date)}</div>
          ${locked ? `<p class="text-red-600 text-sm font-semibold">Pronóstico bloqueado</p>` : ""}
          <div class="flex gap-2 mt-2">
            <input type="number" min="0" class="border rounded p-2 w-24" id="home_${match.id}" value="${prediction?.home_prediction ?? ""}" ${locked ? "disabled" : ""}>
            <input type="number" min="0" class="border rounded p-2 w-24" id="away_${match.id}" value="${prediction?.away_prediction ?? ""}" ${locked ? "disabled" : ""}>
          </div>
        </div>
      `;
    }).join("")}
    ${(matches || []).length ? `<button onclick="saveAllPredictions()" class="bg-emerald-600 text-white rounded-xl px-4 py-3 mt-3 w-full">💾 Guardar Todo</button>` : ""}
  `);
}

async function saveAllPredictions() {
  const { data: matches, error } = await client.from("matches").select("id, match_date");
  if (error) return alert(error.message);

  let saved = 0;

  for (const match of matches || []) {
    if (isMatchLocked(match.match_date)) continue;

    const homeInput = document.getElementById(`home_${match.id}`);
    const awayInput = document.getElementById(`away_${match.id}`);
    if (!homeInput || !awayInput) continue;

    const home = homeInput.value;
    const away = awayInput.value;
    if (home === "" || away === "") continue;

    const { error: upsertError } = await client.from("predictions").upsert({
      user_id: currentUser.id,
      match_id: match.id,
      home_prediction: Number(home),
      away_prediction: Number(away)
    }, { onConflict: "user_id,match_id" });

    if (upsertError) return alert(upsertError.message);
    saved++;
  }

  alert(`${saved} pronósticos guardados`);
  loadPredictions();
}
