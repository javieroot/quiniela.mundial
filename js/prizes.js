async function loadPrizes() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="text-center p-6">
      <p>Cargando premios...</p>
    </div>
  `;

  try {
    const { data: settings, error: settingsError } = await client
      .from("settings")
      .select("*")
      .single();

    if (settingsError) throw settingsError;

    const { data: paidUsers, error: paidUsersError } = await client
      .from("users")
      .select("id")
      .eq("payment_status", "PAID");

    if (paidUsersError) throw paidUsersError;

    const paidParticipants = paidUsers?.length || 0;

    const entryFee = Number(settings.entry_fee || 0);
    const adminPercentage = Number(settings.admin_percentage || 0);
    const firstPercentage = Number(settings.first_place_percentage || 0);
    const secondPercentage = Number(settings.second_place_percentage || 0);
    const thirdPercentage = Number(settings.third_place_percentage || 0);

    const totalPool = paidParticipants * entryFee;
    const adminCommission = totalPool * adminPercentage / 100;
    const prizePool = totalPool - adminCommission;

    const firstPrize = prizePool * firstPercentage / 100;
    const secondPrize = prizePool * secondPercentage / 100;
    const thirdPrize = prizePool * thirdPercentage / 100;

    const standings = await calculateLiveStandings(true);

    const prizeAssignments = calculatePrizeAssignments(standings, [
      firstPrize,
      secondPrize,
      thirdPrize
    ]);

    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-4">
        💰 Bolsa de Premios
      </h2>

      <p class="text-slate-500 mb-6">
        Montos estimados con base en participantes con pago confirmado.
      </p>

      <div class="grid md:grid-cols-3 gap-4 mb-6">
        <div class="bg-yellow-100 rounded-xl p-4 text-center">
          <h3 class="text-xl font-bold">🥇 Primer Lugar</h3>
          <p class="text-2xl font-bold">
            $${firstPrize.toFixed(2)}
          </p>
        </div>

        <div class="bg-slate-100 rounded-xl p-4 text-center">
          <h3 class="text-xl font-bold">🥈 Segundo Lugar</h3>
          <p class="text-2xl font-bold">
            $${secondPrize.toFixed(2)}
          </p>
        </div>

        <div class="bg-orange-100 rounded-xl p-4 text-center">
          <h3 class="text-xl font-bold">🥉 Tercer Lugar</h3>
          <p class="text-2xl font-bold">
            $${thirdPrize.toFixed(2)}
          </p>
        </div>
      </div>

      <div class="bg-white border rounded-xl p-4">
        <h3 class="text-xl font-bold mb-3">
          Reparto estimado según clasificación actual
        </h3>

        ${prizeAssignments.length === 0 ? `
          <p class="text-slate-500">
            Aún no hay participantes con premio asignado.
          </p>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b bg-slate-50">
                  <th class="text-left py-2 px-2">Pos</th>
                  <th class="text-left py-2 px-2">Participante</th>
                  <th class="text-left py-2 px-2">Pts</th>
                  <th class="text-left py-2 px-2">Premio estimado</th>
                </tr>
              </thead>

              <tbody>
                ${prizeAssignments.map(row => `
                  <tr class="border-b">
                    <td class="py-2 px-2 font-bold">
                      ${row.position}
                    </td>

                    <td class="py-2 px-2">
                      ${row.display_name}
                    </td>

                    <td class="py-2 px-2">
                      ${row.points}
                    </td>

                    <td class="py-2 px-2 font-bold">
                      $${row.prize.toFixed(2)}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}

        <p class="text-xs text-slate-500 mt-4">
          Si existe empate en una posición premiada, el premio de esa posición
          se divide en partes iguales entre los participantes empatados.
        </p>
      </div>
    `;
  } catch (error) {
    console.error(error);

    content.innerHTML = `
      <div class="text-red-600">
        Error al cargar premios.
      </div>
    `;
  }
}

function calculatePrizeAssignments(standings, basePrizes) {
  const assignments = [];

  for (let position = 1; position <= 3; position++) {
    const usersInPosition = standings.filter(
      user => user.position === position
    );

    if (usersInPosition.length === 0) {
      continue;
    }

    const prizeForPosition = basePrizes[position - 1] || 0;
    const prizePerUser = prizeForPosition / usersInPosition.length;

    for (const user of usersInPosition) {
      assignments.push({
        position: user.position,
        display_name: user.display_name,
        points: user.points,
        prize: prizePerUser
      });
    }
  }

  return assignments;
}
