async function loadOfficial() {
  const standings = await calculateLiveStandings(true);
  renderStandings(standings, "Clasificación Oficial", true);
}

async function loadGeneral() {
  const standings = await calculateLiveStandings(false);
  renderStandings(standings, "Clasificación General", false);
}

async function calculateLiveStandings(onlyPaid) {
  let userQuery = client
    .from("users")
    .select("id, display_name, payment_status");

  if (onlyPaid) {
    userQuery = userQuery.eq("payment_status", "PAID");
  }

  const { data: users, error: usersError } = await userQuery;

  if (usersError) {
    alert(usersError.message);
    return [];
  }

  const { data: predictions, error: predictionsError } = await client
    .from("predictions")
    .select(`
      user_id,
      home_prediction,
      away_prediction,
      matches (
        home_score,
        away_score,
        status
      )
    `);

  if (predictionsError) {
    alert(predictionsError.message);
    return [];
  }

  const pointsByUser = {};
  const exactsByUser = {};
  const resultsByUser = {};

  for (const user of users || []) {
    pointsByUser[user.id] = 0;
    exactsByUser[user.id] = 0;
    resultsByUser[user.id] = 0;
  }

  for (const prediction of predictions || []) {
    if (!(prediction.user_id in pointsByUser)) {
      continue;
    }

    const match = prediction.matches;

    if (!match || match.status !== "FINISHED") continue;
    if (match.home_score === null || match.away_score === null) continue;

    let points = 0;

    const predictedDiff =
      prediction.home_prediction - prediction.away_prediction;

    const realDiff =
      match.home_score - match.away_score;

    const predictedResult =
      predictedDiff > 0 ? "HOME" :
      predictedDiff < 0 ? "AWAY" :
      "DRAW";

    const realResult =
      realDiff > 0 ? "HOME" :
      realDiff < 0 ? "AWAY" :
      "DRAW";

    if (predictedResult === realResult) {
      points += 1;
      resultsByUser[prediction.user_id] += 1;
    }

    if (
      prediction.home_prediction === match.home_score &&
      prediction.away_prediction === match.away_score
    ) {
      points += 1;
      exactsByUser[prediction.user_id] += 1;
    }

    pointsByUser[prediction.user_id] += points;
  }

  return (users || [])
    .map(user => ({
      id: user.id,
      display_name: user.display_name,
      payment_status: user.payment_status,
      points: pointsByUser[user.id] || 0,
      exacts: exactsByUser[user.id] || 0,
      results: resultsByUser[user.id] || 0
    }))
    .sort((a, b) =>
      b.points - a.points ||
      b.exacts - a.exacts ||
      b.results - a.results ||
      a.display_name.localeCompare(b.display_name)
    );
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
            <th class="text-left py-2 px-2">Pts</th>
            <th class="text-left py-2 px-2">Exactos</th>
            <th class="text-left py-2 px-2">Resultados</th>
            ${official ? "" : `<th class="text-left py-2 px-2">Estado</th>`}
          </tr>
        </thead>

        <tbody>
          ${users.length === 0 ? `
            <tr>
              <td colspan="6" class="py-4 text-slate-500">
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

              <td class="py-2 px-2">
                ${user.exacts}
              </td>

              <td class="py-2 px-2">
                ${user.results}
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
