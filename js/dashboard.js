async function renderDashboard() {

  const status =
    currentUser.payment_status === "PAID"
      ? "🟢 Pago Confirmado"
      : "🟡 Pago Pendiente";

  let tournamentName = "";

  try {
    const { data } = await client
      .from("settings")
      .select("tournament_name")
      .eq("id", 1)
      .single();

    tournamentName = data?.tournament_name || "";
  } catch (err) {
    console.error(err);
  }

  render(`
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="text-3xl font-bold">
          🏆 ${PRONOSTIX_CONFIG.platformName}
        </h1>

        <p class="text-slate-500">
          ${tournamentName}
        </p>
      </div>

      <button
        onclick="logout()"
        class="bg-slate-800 text-white px-3 py-2 rounded"
      >
        Salir
      </button>
    </div>

    <div class="bg-white rounded-2xl shadow p-4 mb-4">
      <h2 class="text-xl font-bold">
        ${currentUser.display_name}
      </h2>

      <p>${status}</p>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4">

      <button
        onclick="loadOfficial()"
        class="bg-blue-600 text-white rounded-xl p-3"
      >
        Clasificación Oficial
      </button>

      <button
        onclick="loadGeneral()"
        class="bg-indigo-600 text-white rounded-xl p-3"
      >
        Clasificación General
      </button>

      <button
        onclick="loadPredictions()"
        class="bg-emerald-600 text-white rounded-xl p-3"
      >
        Mis Pronósticos
      </button>

      <button
        onclick="loadPrizes()"
        class="bg-green-700 text-white rounded-xl p-3"
      >
        💰 Premios
      </button>

      <button
        onclick="loadSpecials()"
        class="bg-amber-500 text-white rounded-xl p-3"
      >
        Especiales
      </button>

      ${currentUser.is_admin
        ? `
          <button
            onclick="loadAdmin()"
            class="bg-red-600 text-white rounded-xl p-3 col-span-2"
          >
            Admin
          </button>
        `
        : ""
      }

    </div>

    <div
      id="content"
      class="bg-white rounded-2xl shadow p-4"
    >
      <p>Selecciona una opción.</p>
    </div>
  `);
}
