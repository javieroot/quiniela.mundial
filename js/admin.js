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

  setContent(`
    <h2 class="text-xl font-bold mb-3">Administración</h2>

    ${(users || []).map(u => `
      <div class="border rounded-xl p-3 mb-2">
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

    <hr class="my-6">

    <h2 class="text-xl font-bold mb-3">
      ⚙️ Configuración
    </h2>

    <div class="border rounded-xl p-4">

      <label class="block mb-2">
        Nombre del torneo
      </label>

      <input
        id="cfgTournament"
        class="border rounded p-2 w-full mb-3"
        value="${settings.tournament_name}"
      >

      <label class="block mb-2">
        Costo de inscripción
      </label>

      <input
        id="cfgEntryFee"
        type="number"
        step="0.01"
        class="border rounded p-2 w-full mb-3"
        value="${settings.entry_fee}"
      >

      <label class="block mb-2">
        % Administrador
      </label>

      <input
        id="cfgAdmin"
        type="number"
        step="0.01"
        class="border rounded p-2 w-full mb-3"
        value="${settings.admin_percentage}"
      >

      <label class="block mb-2">
        % Primer Lugar
      </label>

      <input
        id="cfgFirst"
        type="number"
        step="0.01"
        class="border rounded p-2 w-full mb-3"
        value="${settings.first_place_percentage}"
      >

      <label class="block mb-2">
        % Segundo Lugar
      </label>

      <input
        id="cfgSecond"
        type="number"
        step="0.01"
        class="border rounded p-2 w-full mb-3"
        value="${settings.second_place_percentage}"
      >

      <label class="block mb-2">
        % Tercer Lugar
      </label>

      <input
        id="cfgThird"
        type="number"
        step="0.01"
        class="border rounded p-2 w-full mb-3"
        value="${settings.third_place_percentage}"
      >

      <button
        onclick="saveSettings()"
        class="bg-emerald-600 text-white rounded px-4 py-2"
      >
        Guardar configuración
      </button>

    </div>
  `);
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
    <h2 class="text-xl font-bold mb-3">
      Contraseña temporal
    </h2>

    <p class="mb-2">
      Usuario: <strong>${username}</strong>
    </p>

    <input
      id="tempPassword"
      class="border rounded p-2 w-full mb-3 font-mono"
      value="${tempPassword}"
      readonly
    >

    <button
      onclick="copyTempPassword()"
      class="bg-blue-600 text-white rounded px-4 py-2 mr-2"
    >
      Copiar contraseña
    </button>

    <button
      onclick="loadAdmin()"
      class="bg-slate-700 text-white rounded px-4 py-2"
    >
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

  const admin =
    Number(document.getElementById("cfgAdmin").value);

  const first =
    Number(document.getElementById("cfgFirst").value);

  const second =
    Number(document.getElementById("cfgSecond").value);

  const third =
    Number(document.getElementById("cfgThird").value);

  const total =
    admin + first + second + third;

  if (total > 100) {
    return alert(
      "La suma de porcentajes no puede exceder 100%"
    );
  }

  const { data, error } = await client
    .from("settings")
    .update({
      tournament_name:
        document.getElementById("cfgTournament").value,

      entry_fee:
        Number(document.getElementById("cfgEntryFee").value),

      admin_percentage: admin,

      first_place_percentage: first,

      second_place_percentage: second,

      third_place_percentage: third
    })
    .eq("id", 1)
    .select();

  if (error) {
    alert(error.message);
    return;
  }

  alert("Configuración guardada");

  loadAdmin();
}
