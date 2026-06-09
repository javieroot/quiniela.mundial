async function loadPrizes() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="text-center p-6">
      <p>Cargando premios...</p>
    </div>
  `;

  try {
    // Configuración
    const { data: settings } = await client
      .from("settings")
      .select("*")
      .single();

    // Usuarios pagados
    const { data: paidUsers } = await client
      .from("users")
      .select("id")
      .eq("payment_status", "PAID");

    const paidParticipants = paidUsers?.length || 0;

    const entryFee = Number(settings.entry_fee || 0);

    const adminPercentage = Number(
      settings.admin_percentage || 0
    );

    const firstPercentage = Number(
      settings.first_place_percentage || 0
    );

    const secondPercentage = Number(
      settings.second_place_percentage || 0
    );

    const thirdPercentage = Number(
      settings.third_place_percentage || 0
    );

    const totalPool =
      paidParticipants * entryFee;

    const adminCommission =
      totalPool * adminPercentage / 100;

    const prizePool =
      totalPool - adminCommission;

    const firstPrize =
      prizePool * firstPercentage / 100;

    const secondPrize =
      prizePool * secondPercentage / 100;

    const thirdPrize =
      prizePool * thirdPercentage / 100;

    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-4">
        💰 Bolsa de Premios
      </h2>

      <div class="space-y-2 mb-6">
        <p><strong>Participantes pagados:</strong> ${paidParticipants}</p>
        <p><strong>Costo inscripción:</strong> $${entryFee.toFixed(2)}</p>
        <p><strong>Pozo total:</strong> $${totalPool.toFixed(2)}</p>
        <p><strong>Bolsa de premios:</strong> $${prizePool.toFixed(2)}</p>
      </div>

      <div class="grid md:grid-cols-3 gap-4">

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
