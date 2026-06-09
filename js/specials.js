async function loadSpecials() {
  const { data } = await client.from("special_predictions").select("*").eq("user_id", currentUser.id).maybeSingle();

  setContent(`
    <h2 class="text-xl font-bold mb-3">Pronósticos Especiales</h2>
    <p class="text-sm text-slate-500 mb-3">Se capturan una vez y se podrán bloquear al inicio del torneo.</p>
    <input id="champion" class="border rounded p-2 w-full mb-2" placeholder="Campeón" value="${data?.champion ?? ""}">
    <input id="runnerUp" class="border rounded p-2 w-full mb-2" placeholder="Subcampeón" value="${data?.runner_up ?? ""}">
    <input id="thirdPlace" class="border rounded p-2 w-full mb-2" placeholder="Tercer lugar" value="${data?.third_place ?? ""}">
    <input id="topScorer" class="border rounded p-2 w-full mb-3" placeholder="Máximo goleador" value="${data?.top_scorer ?? ""}">
    <button onclick="saveSpecials()" class="bg-amber-500 text-white rounded p-2 w-full">Guardar especiales</button>
  `);
}

async function saveSpecials() {
  const { error } = await client.from("special_predictions").upsert({
    user_id: currentUser.id,
    champion: document.getElementById("champion").value.trim(),
    runner_up: document.getElementById("runnerUp").value.trim(),
    third_place: document.getElementById("thirdPlace").value.trim(),
    top_scorer: document.getElementById("topScorer").value.trim()
  }, { onConflict: "user_id" });

  if (error) return alert(error.message);
  alert("Pronósticos especiales guardados");
}
