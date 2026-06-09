async function loadAdmin() {
  if (!currentUser.is_admin) return alert("No autorizado");

  const { data: users, error } = await client.from("users").select("*").order("created_at");
  if (error) return alert(error.message);

  setContent(`
    <h2 class="text-xl font-bold mb-3">Administración</h2>
    ${(users || []).map(u => `
      <div class="border rounded-xl p-3 mb-2">
        <p class="font-bold">${u.display_name}</p>
        <p class="text-sm text-slate-600">${u.username} - ${u.payment_status}</p>
        <button onclick="togglePayment('${u.id}', '${u.payment_status}')" class="bg-blue-600 text-white rounded px-3 py-1 mt-2">Cambiar pago</button>
        <button onclick="resetUserPassword('${u.id}', '${u.username}')" class="bg-slate-700 text-white rounded px-3 py-1 mt-2 ml-2">Resetear contraseña</button>
      </div>
    `).join("")}
  `);
}

async function togglePayment(userId, status) {
  const next = status === "PAID" ? "PENDING" : "PAID";

  const { error } = await client.from("users").update({ payment_status: next }).eq("id", userId);
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
  const value = input.value;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      alert("Contraseña copiada");
      return;
    }

    input.focus();
    input.select();
    input.setSelectionRange(0, 99999);

    const ok = document.execCommand("copy");

    alert(ok ? "Contraseña copiada" : "Selecciona y copia manualmente");
  } catch (err) {
    input.focus();
    input.select();
    input.setSelectionRange(0, 99999);
    alert("No se pudo copiar automático. Ya quedó seleccionada para copiar manualmente.");
  }
}
