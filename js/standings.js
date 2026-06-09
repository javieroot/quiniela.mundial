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

  const { data: settings, error: settingsError } = await client
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settingsError) {
    alert(settingsError.message);
    return [];
  }

  const { data: predictions, error: predictionsError } = await client
    .from("predictions")
    .select(`
      user_id,
      home_prediction,
      away_prediction,
      updated_at,
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

  const { data: specialPredictions, error: specialPredictionsError } = await client
    .from("special_predictions")
    .select(`
      user_id,
      champion,
      runner_up,
      third_place,
      top_scorer,
      updated_at
    `);

  if (specialPredictionsError) {
    alert(specialPredictionsError.message);
    return [];
  }

  const { data: specialResults, error: specialResultsError } = await client
    .from("special_results")
    .select(`
      champion,
      runner_up,
      third_place,
      top_scorer
    `)
    .eq("tournament_id", 1)
    .maybeSingle();

  if (specialResultsError) {
    alert(specialResultsError.message);
    return [];
  }

  const pointsByUser = {};
  const matchPointsByUser = {};
  const specialPointsByUser = {};
  const exactsByUser = {};
  const resultsByUser = {};
  const lastUpdateByUser = {};

  for (const user of users || []) {
    pointsByUser[user.id] = 0;
    matchPointsByUser[user.id] = 0;
    specialPointsByUser[user.id] = 0;
    exactsByUser[user.id] = 0;
    resultsByUser[user.id] = 0;
    lastUpdateByUser[user.id] = null;
  }

  for (const prediction of predictions || []) {
    if (!(prediction.user_id in pointsByUser)) continue;

    updateLastEdit(lastUpdateByUser, prediction.user_id, prediction.updated_at);

    const match = prediction.matches;

    if (!match || match.status !== "FINISHED") continue;
    if (match.home_score === null || match.away_score === null) continue;

    let points = 0;

    const predictedDiff = prediction.home_prediction - prediction.away_prediction;
    const realDiff = match.home_score - match.away_score;

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

    matchPointsByUser[prediction.user_id] += points;
    pointsByUser[prediction.user_id] += points;
  }

  for (const special of specialPredictions || []) {
    if (!(special.user_id in pointsByUser)) continue;

    updateLastEdit(lastUpdateByUser, special.user_id, special.updated_at);

    if (!specialResults) continue;

    let specialPoints = 0;

    if (isSameText(special.champion, specialResults.champion)) {
      specialPoints += 5;
    }

    if (isSameText(special.runner_up, specialResults.runner_up)) {
      specialPoints += 3;
    }

    if (isSameText(special.third_place, specialResults.third_place)) {
      specialPoints += 2;
    }

    if (isSameText(special.top_scorer, specialResults.top_scorer)) {
      specialPoints += 5;
    }

    specialPointsByUser[special.user_id] += specialPoints;
    pointsByUser[special.user_id] += specialPoints;
  }

  const sortedUsers = (users || [])
    .map(user => ({
      id: user.id,
      display_name: user.display_name,
      payment_status: user.payment_status,
      points: pointsByUser[user.id] || 0,
      matchPoints: matchPointsByUser[user.id] || 0,
      specialPoints: specialPointsByUser[user.id] || 0,
      exacts: exactsByUser[user.id] || 0,
      results: resultsByUser[user.id] || 0,
      lastUpdate: lastUpdateByUser[user.id],
      prize: 0
    }))
    .sort(compareStandings);

  assignSharedPositions(sortedUsers);
  assignPrizes(sortedUsers, settings);

  return sortedUsers;
}

function compareStandings(a, b) {
  return (
    b.points - a.points ||
    b.specialPoints - a.specialPoints ||
    b.exacts - a.exacts ||
    b.results - a.results ||
    compareLastUpdate(a.lastUpdate, b.lastUpdate)
  );
}

function compareLastUpdate(aDate, bDate) {
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;

  return new Date(aDate).getTime() - new Date(bDate).getTime();
}

function assignSharedPositions(users) {
  let currentPosition = 1;

  for (let i = 0; i < users.length; i++) {
    if (i === 0) {
      users[i].position = currentPosition;
      continue;
    }

    const previous = users[i - 1];
    const current = users[i];

    const tied =
      previous.points === current.points &&
      previous.specialPoints === current.specialPoints &&
      previous.exacts === current.exacts &&
      previous.results === current.results &&
      normalizeDate(previous.lastUpdate) === normalizeDate(current.lastUpdate);

    if (!tied) {
      currentPosition++;
    }

    current.position = currentPosition;
  }
}

function assignPrizes(users, settings) {
  const participants = users.length;

  const entryFee = Number(settings.entry_fee || 0);
  const adminPercentage = Number(settings.admin_percentage || 0);
  const firstPercentage = Number(settings.first_place_percentage || 0);
  const secondPercentage = Number(settings.second_place_percentage || 0);
  const thirdPercentage = Number(settings.third_place_percentage || 0);

  const totalPool = participants * entryFee;
  const adminCommission = totalPool * adminPercentage / 100;
  const prizePool = totalPool - adminCommission;

  const prizesByPosition = {
    1: prizePool * firstPercentage / 100,
    2: prizePool * secondPercentage / 100,
    3: prizePool * thirdPercentage / 100
  };

  for (const position of [1, 2, 3]) {
    const usersInPosition = users.filter(user => user.position === position);

    if (usersInPosition.length === 0) continue;

    const prizeForPosition = prizesByPosition[position] || 0;
    const prizePerUser = prizeForPosition / usersInPosition.length;

    for (const user of usersInPosition) {
      user.prize = prizePerUser;
    }
  }
}

function normalizeDate(value) {
  return value ? new Date(value).getTime() : null;
}

function updateLastEdit(lastUpdateByUser, userId, updatedAt) {
  if (!updatedAt) return;

  if (!lastUpdateByUser[userId]) {
    lastUpdateByUser[userId] = updatedAt;
    return;
  }

  const current = new Date(lastUpdateByUser[userId]).getTime();
  const incoming = new Date(updatedAt).getTime();

  if (incoming > current) {
    lastUpdateByUser[userId] = updatedAt;
  }
}

function isSameText(a, b) {
  if (!a || !b) return false;

  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function renderStandings(users, title, official) {
  const winners = users.filter(user => user.position <= 3 && user.prize > 0);
  const hasWinners = winners.length > 0;

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
        Esta tabla muestra a todos los participantes registrados como si todos participaran por premios.
      </p>
    `}

    ${hasWinners ? `
      <div class="grid md:grid-cols-3 gap-3 mb-5">
        ${winners.map(user => `
          <div class="border rounded-xl p-3 bg-slate-50">
            <p class="text-sm text-slate-500">
              ${user.position === 1 ? "🥇 Primer lugar" : ""}
              ${user.position === 2 ? "🥈 Segundo lugar" : ""}
              ${user.position === 3 ? "🥉 Tercer lugar" : ""}
            </p>

            <p class="font-bold">
              ${user.display_name}
            </p>

            <p class="text-sm">
              ${user.points} pts
            </p>

            <p class="font-bold text-emerald-700">
              ${formatMoney(user.prize)}
            </p>
          </div>
        `).join("")}
      </div>
    ` : ""}

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-slate-50">
            <th class="text-left py-2 px-2">Pos</th>
            <th class="text-left py-2 px-2">Participante</th>
            <th class="text-left py-2 px-2">Pts</th>
            <th class="text-left py-2 px-2">Premio</th>
            <th class="text-left py-2 px-2">Partidos</th>
            <th class="text-left py-2 px-2">Especiales</th>
            <th class="text-left py-2 px-2">Exactos</th>
            <th class="text-left py-2 px-2">Resultados</th>
            ${official ? "" : `<th class="text-left py-2 px-2">Estado</th>`}
          </tr>
        </thead>

        <tbody>
          ${users.length === 0 ? `
            <tr>
              <td colspan="${official ? 8 : 9}" class="py-4 text-slate-500">
                No hay participantes para mostrar.
              </td>
            </tr>
          ` : ""}

          ${users.map(user => `
            <tr class="border-b ${user.position <= 3 ? "bg-emerald-50" : ""}">
              <td class="py-2 px-2 font-bold">
                ${user.position}
              </td>

              <td class="py-2 px-2">
                ${user.display_name}
              </td>

              <td class="py-2 px-2 font-bold">
                ${user.points}
              </td>

              <td class="py-2 px-2 font-bold">
                ${user.prize > 0 ? formatMoney(user.prize) : "-"}
              </td>

              <td class="py-2 px-2">
                ${user.matchPoints}
              </td>

              <td class="py-2 px-2">
                ${user.specialPoints}
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
