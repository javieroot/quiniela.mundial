async function loadSpecials() {
  const { data: special, error: specialError } = await client
    .from("special_predictions")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (specialError) return alert(specialError.message);

  const { data: activeTournament, error: tournamentError } = await client
    .from("tournaments")
    .select("id, name")
    .eq("is_active", true)
    .single();

  if (tournamentError) return alert(tournamentError.message);

  const { data: teams, error: teamsError } = await client
    .from("teams")
    .select("name")
    .eq("tournament_id", activeTournament.id)
    .order("name");

  if (teamsError) return alert(teamsError.message);

  const teamOptions = (selectedValue) => `
    <option value="">Selecciona equipo</option>
    ${(teams || []).map(t => `
      <option
        value="${t.name}"
        ${selectedValue === t.name ? "selected" : ""}
      >
        ${t.name}
      </option>
    `).join("")}
  `;

  setContent(`
    <h2 class="text-xl font-bold mb-3">
      Pronósticos Especiales
    </h2>

    <p class="text-sm text-slate-500 mb-3">
      Torneo: ${activeTournament.name}
    </p>

    <label class="block text-sm font-bold mb-1">
      Campeón
    </label>
    <select
      id="champion"
      class="border rounded p-2 w-full mb-2"
    >
      ${teamOptions(special?.champion ?? "")}
    </select>

    <label class="block text-sm font-bold mb-1">
      Subcampeón
    </label>
    <select
      id="runnerUp"
      class="border rounded p-2 w-full mb-2"
    >
      ${teamOptions(special?.runner_up ?? "")}
    </select>

    <label class="block text-sm font-bold mb-1">
      Tercer lugar
    </label>
    <select
      id="thirdPlace"
      class="border rounded p-2 w-full mb-2"
    >
      ${teamOptions(special?.third_place ?? "")}
    </select>

    <label class="block text-sm font-bold mb-1">
      Máximo goleador
    </label>
    <input
      id="topScorer"
      class="border rounded p-2 w-full mb-3"
      placeholder="Máximo goleador"
      value="${special?.top_scorer ?? ""}"
    >

    <button
      onclick="saveSpecials()"
      class="bg-amber-500 text-white rounded p-2 w-full"
    >
      Guardar especiales
    </button>
  `);
}

async function saveSpecials() {
  const champion = document.getElementById("champion").value;
  const runnerUp = document.getElementById("runnerUp").value;
  const thirdPlace = document.getElementById("thirdPlace").value;
  const topScorer = document.getElementById("topScorer").value.trim();

  if (!champion || !runnerUp || !thirdPlace) {
    return alert("Selecciona campeón, subcampeón y tercer lugar");
  }

  const { error } = await client
    .from("special_predictions")
    .upsert({
      user_id: currentUser.id,
      champion,
      runner_up: runnerUp,
      third_place: thirdPlace,
      top_scorer: topScorer
    }, { onConflict: "user_id" });

  if (error) return alert(error.message);

  alert("Pronósticos especiales guardados");
}
