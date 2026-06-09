async function loadOfficial() {
  const { data, error } = await client.from("users").select("*").eq("payment_status", "PAID").order("created_at");
  if (error) return alert(error.message);
  renderUsers(data || [], "Clasificación Oficial");
}

async function loadGeneral() {
  const { data, error } = await client.from("users").select("*").order("created_at");
  if (error) return alert(error.message);
  renderUsers(data || [], "Clasificación General");
}

function renderUsers(users, title) {
  setContent(`
    <h2 class="text-xl font-bold mb-3">${title}</h2>
    <table class="w-full text-sm">
      <tr class="border-b">
        <th class="text-left py-2">#</th>
        <th class="text-left py-2">Nombre</th>
        <th class="text-left py-2">Estado</th>
      </tr>
      ${users.map((u, i) => `
        <tr class="border-b">
          <td class="py-2">${i + 1}</td>
          <td class="py-2">${u.display_name}</td>
          <td class="py-2">${u.payment_status === "PAID" ? "🟢 Pagado" : "🟡 Pendiente"}</td>
        </tr>
      `).join("")}
    </table>
    <p class="text-xs text-slate-500 mt-3">La clasificación oficial considera únicamente participantes con pago confirmado.</p>
  `);
}
