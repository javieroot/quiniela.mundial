let adminUsersExpanded = false;
let adminResultsExpanded = false;

async function loadAdmin() {
  if (!currentUser.is_admin) return alert("No autorizado");

  const { data: users, error } = await client
    .from("users")
    .select("*")
    .order("created_at");

  if (error) return alert(error.message);

  const { data: settings, error: settingsError } = await client
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settingsError) return alert(settingsError.message);
  
  const { data: activeTournament, error: tournamentError } = await client
    .from("tournaments")
    .select("id, name")
    .eq("is_active", true)
    .single();

  if (tournamentError) return alert(tournamentError.message);

  const { data: matches, error: matchesError } = await client
    .from("matches")
    .select("*")
    .order("match_date");

  if (matchesError) return alert(matchesError.message);

  const totalUsers = (users || []).length;
  const paidUsers = (users || []).filter(u => u.payment_status === "PAID").length;
  const pendingUsers = totalUsers - paidUsers;

  const pendingResults = (matches || []).filter(match =>
    match.home_score === null ||
    match.away_score === null
  ).length;

  setContent(`
    <h2 class="text-xl font-bold mb-3">Administración</h2>

    <h2 class="text-xl font-bold mb-3">
      ⚙️ Configuración
    </h2>
    <div class="border rounded-xl p-4 bg-white">
      <label class="block mb-2 font-medium">Nombre del torneo</label>
      <input
        id="cfgTournament"
        class="border rounded p-2 w-full mb-4"
        value="${activeTournament.name}"
      >
    
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 font-medium">Costo de inscripción</label>
          <input
            id="cfgEntryFee"
            type="number"
            step="0.01"
            class="border rounded p-2 w-full"
            value="${settings.entry_fee}"
          >
        </div>
    
        <div>
          <label class="block mb-2 font-medium">% Administrador</label>
          <input
            id="cfgAdmin"
            type="number"
            step="0.01"
            class="border rounded p-2 w-full"
            value="${settings.admin_percentage}"
          >
        </div>
    
        <div>
          <label class="block mb-2 font-medium">% Primer lugar</label>
          <input
            id="cfgFirst"
            type="number"
            step="0.01"
            class="border rounded p-2 w-full"
            value="${settings.first_place_percentage}"
          >
        </div>
    
        <div>
          <label class="block mb-2 font-medium">% Segundo lugar</label>
          <input
            id="cfgSecond"
            type="number"
            step="0.01"
            class="border rounded p-2 w-full"
            value="${settings.second_place_percentage}"
          >
        </div>
    
        <div>
          <label class="block mb-2 font-medium">% Tercer lugar</label>
          <input
            id="cfgThird"
            type="number"
            step="0.01"
            class="border rounded p-2 w-full"
            value="${settings.third_place_percentage}"
          >
        </div>
      </div>
    
      <button
        onclick="saveSettings()"
        class="bg-emerald-600 text-white rounded-xl px-4 py-3 w-full font-bold mt-5"
      >
        Guardar configuración
      </button>
    </div>

    <hr class="my-6">

    <div class="border rounded-xl p-4 bg-slate-50">
      <button
        onclick="toggleAdminUsers()"
        class="w-full flex justify-between items-center text-left"
      >
        <span class="text-xl font-bold">
          👥 Participantes (${totalUsers})
        </span>

        <span class="text-xl">
          ${adminUsersExpanded ? "▲" : "▼"}
        </span>
      </button>

      <p class="text-sm text-slate-500 mt-2">
        Pagados: ${paidUsers} · Pendientes: ${pendingUsers}
      </p>

      ${adminUsersExpanded ? `
        <div class="mt-4">
          ${(users || []).map(u => `
            <div class="border rounded-xl p-3 mb-2 bg-white">
              <p class="font-bold">${u.display_name}</p>

              <p class="text-sm text-slate-600">
                ${u.username} - ${u.payment_status}
              </p>

              <button
                onclick="togglePayment('${u.id}', '${u.payment_status}')"
                class="bg-blue-600 text-white rounded px-3 py-1 mt-2"
              >
                Cambiar pago
              </button>

              <button
                onclick="resetUserPassword('${u.id}', '${u.username}')"
                class="bg-slate-700 text-white rounded px-3 py-1 mt-2 ml-2"
              >
                Resetear contraseña
              </button>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>

    <hr class="my-6">

    <div class="border rounded-xl p-4 bg-slate-50">
      <button
        onclick="toggleAdminResults()"
        class="w-full flex justify-between items-center text-left"
      >
        <span class="text-xl font-bold">
          📊 Captura de resultados (${pendingResults} pendientes)
        </span>

        <span class="text-xl">
          ${adminResultsExpanded ? "▲" : "▼"}
        </span>
      </button>
      ${adminResultsExpanded ? `
        <div class="mt-4 space-y-3">
            ${(matches || []).length ? `
            <div class="sticky top-0 bg-slate-50 pb-3 z-10">
              <button
                onclick="saveMatchResults()"
                class="bg-blue-600 text-white rounded-xl px-4 py-3 w-full font-bold shadow"
              >
                💾 Guardar resultados
              </button>
            </div>
          ` : ""}
          ${(matches || []).length ? (matches || []).map(match => `
            <div class="border rounded-xl p-3 bg-white">
              <p class="font-bold">
                ${match.home_team} vs ${match.away_team}
              </p>

              <p class="text-sm text-slate-500 mb-3">
                ${formatDateTime(match.match_date)}
              </p>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm mb-1">${match.home_team}</label>
                  <input
                    id="result_home_${match.id}"
                    type="number"
                    min="0"
                    class="border rounded p-2 w-full text-center"
                    value="${match.home_score ?? ""}"
                    placeholder="0"
                  >
                </div>

                <div>
                  <label class="block text-sm mb-1">${match.away_team}</label>
                  <input
                    id="result_away_${match.id}"
                    type="number"
                    min="0"
                    class="border rounded p-2 w-full text-center"
                    value="${match.away_score ?? ""}"
                    placeholder="0"
                  >
                </div>
              </div>
            </div>
          `).join("") : `
            <p class="text-slate-500">No hay partidos cargados.</p>
          `}
        </div>
      ` : ""}
    </div>
  `);
}

function toggleAdminUsers() {
  adminUsersExpanded = !adminUsersExpanded;
  loadAdmin();
}

function toggleAdminResults() {
  adminResultsExpanded = !adminResultsExpanded;
  loadAdmin();
}

async function saveMatchResults() {
  const { data: matches, error } = await client
    .from("matches")
    .select("id");

  if (error) return alert(error.message);

  let saved = 0;

  for (const match of matches || []) {
    const homeInput = document.getElementById(`result_home_${match.id}`);
    const awayInput = document.getElementById(`result_away_${match.id}`);

    if (!homeInput || !awayInput) continue;

    const homeValue = homeInput.value.trim();
    const awayValue = awayInput.value.trim();

    if (homeValue === "" && awayValue === "") continue;

    if (homeValue === "" || awayValue === "") {
      return alert("Debes capturar ambos marcadores del partido.");
    }

    const homeScore = Number(homeValue);
    const awayScore = Number(awayValue);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      return alert("Los marcadores deben ser números enteros mayores o iguales a 0.");
    }

    const { data: updated, error: updateError } = await client
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore
      })
      .eq("id", match.id)
      .select();

    if (updateError) return alert(updateError.message);

    if (!updated || updated.length === 0) {
      return alert(`No se pudo actualizar el partido ${match.id}. Revisa permisos o RLS.`);
    }

    saved++;
  }

  if (saved === 0) {
    return alert("No hay resultados nuevos para guardar.");
  }

  alert(`${saved} resultado(s) guardado(s)`);
  await loadAdmin();
}

async function togglePayment(userId, status) {
  const next = status === "PAID" ? "PENDING" : "PAID";

  const { error } = await client
    .from("users")
    .update({ payment_status: next })
    .eq("id", userId);

  if (error) return alert(error.message);

  if (currentUser.id === userId) {
    currentUser.payment_status = next;
    setCurrentUser(currentUser);
  }

  alert("Estado actualizado");
  loadAdmin();
}

function generateTempPassword() {
  return "PRX-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function resetUserPassword(userId, username) {
  const tempPassword = generateTempPassword();
  const hash = await sha256(tempPassword);

  const { error: credError } = await client
    .from("credentials")
    .update({ password_hash: hash })
    .eq("user_id", userId);

  if (credError) return alert(credError.message);

  const { error: userError } = await client
    .from("users")
    .update({ must_change_password: true })
    .eq("id", userId);

  if (userError) return alert(userError.message);

  setContent(`
    <h2 class="text-xl font-bold mb-3">Contraseña temporal</h2>

    <p class="mb-2">
      Usuario: <strong>${username}</strong>
    </p>

    <input id="tempPassword" class="border rounded p-2 w-full mb-3 font-mono" value="${tempPassword}" readonly>

    <button onclick="copyTempPassword()" class="bg-blue-600 text-white rounded px-4 py-2 mr-2">
      Copiar contraseña
    </button>

    <button onclick="loadAdmin()" class="bg-slate-700 text-white rounded px-4 py-2">
      Volver
    </button>

    <p class="text-sm text-slate-500 mt-3">
      El usuario deberá cambiarla al iniciar sesión.
    </p>
  `);
}

async function copyTempPassword() {
  const input = document.getElementById("tempPassword");

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(input.value);
      alert("Contraseña copiada");
      return;
    }

    input.select();
    document.execCommand("copy");
    alert("Contraseña copiada");
  } catch (err) {
    input.select();
    alert("No se pudo copiar automáticamente");
  }
}

async function saveSettings() {
  const admin = Number(document.getElementById("cfgAdmin").value);
  const first = Number(document.getElementById("cfgFirst").value);
  const second = Number(document.getElementById("cfgSecond").value);
  const third = Number(document.getElementById("cfgThird").value);

  const total = admin + first + second + third;

  if (total > 100) {
    return alert("La suma de porcentajes no puede exceder 100%");
  }

  const tournamentName =
    document.getElementById("cfgTournament").value;
  
  const { error: tournamentError } = await client
    .from("tournaments")
    .update({
      name: tournamentName
    })
    .eq("is_active", true);
  
  if (tournamentError) {
    return alert(tournamentError.message);
  }
  
  const { error } = await client
    .from("settings")
    .update({
      entry_fee: Number(document.getElementById("cfgEntryFee").value),
      admin_percentage: admin,
      first_place_percentage: first,
      second_place_percentage: second,
      third_place_percentage: third
    })
    .eq("id", 1);

  if (error) return alert(error.message);

  alert("Configuración guardada");
  loadAdmin();
}
