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

  alert(
    `Contraseña temporal para ${username}:\n\n${tempPassword}\n\nDebe cambiarla al iniciar sesión.`
  );
}
