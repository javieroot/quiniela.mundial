async function loadOfficial() {
  const standings = await getStandings(true);
  renderStandings(standings, "Clasificación Oficial", true);
}

async function loadGeneral() {
  const standings = await getStandings(false);
  renderStandings(standings, "Clasificación General", false);
}

async function getStandings(onlyPaid) {
  let query = client
    .from("users")
    .select(`
      id,
      display_name,
      payment_status,
      standings (
        points
      )
    `);

  if (onlyPaid) {
    query = query.eq("payment_status", "PAID");
  }

  const { data, error } = await query;

  if (error) {
    alert(error.message);
    return [];
  }

  return (data || [])
    .map(user => ({
      id: user.id,
      display_name: user.display_name,
      payment_status: user.payment_status,
      points: user.standings?.points ?? 0
    }))
    .sort((a, b) => b.points - a.points);
}

function renderStandings(users, title, official) {
  setContent(`
    <h2 class="text-xl font-bold mb-3">
      ${title}
    </h2>

    ${official ? `
      <p class="text-sm text-slate-500 mb-3">
        Esta es la tabla válida para premios. Solo incluye participantes con pago confirmado.
      </p>
    ` : `
      <p class="text-sm text-slate-500 mb-3">
        Esta tabla muestra a todos los participantes. La oficial para premios es la de pagados.
      </p>
    `}

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-slate-50">
            <th class="text-left py-2 px-2">Pos</th>
            <th class="text-left py-2 px-2">Participante</th>
            <th class="text-left py-2 px-2">Puntos</th>
            ${official ? "" : `<th class="text-left py-2 px-2">Estado</th>`}
          </tr>
        </thead>

        <tbody>
          ${users.length === 0 ? `
            <tr>
              <td colspan="4" class="py-4 text-slate-500">
                No hay participantes para mostrar.
              </td>
            </tr>
          ` : ""}

          ${users.map((user, index) => `
            <tr class="border-b">
              <td class="py-2 px-2 font-bold">
                ${index + 1}
              </td>

              <td class="py-2 px-2">
                ${user.display_name}
              </td>

              <td class="py-2 px-2 font-bold">
                ${user.points}
              </td>

              ${official ? "" : `
                <td class="py-2 px-2">
                  ${user.payment_status === "PAID"
                    ? "🟢 Pagado"
                    : "🟡 Pendiente"}
                </td>
              `}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `);
}
