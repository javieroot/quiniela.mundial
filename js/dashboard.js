async function renderDashboard() {

  const status =
    currentUser.payment_status === "PAID"
      ? "🟢 Pago Confirmado"
      : "🟡 Pago Pendiente";

 let tournamentName = "";

  try {
    const { data } = await client
      .from("tournaments")
      .select("name")
      .eq("is_active", true)
      .single();
  
    tournamentName = data?.name || "";
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
        onclick="loadRules()"
        class="bg-slate-700 text-white rounded-xl p-3"
      >
        📜 Reglas
      </button>
      
      <button
        onclick="loadFAQ()"
        class="bg-slate-500 text-white rounded-xl p-3"
      >
        ❓ FAQ
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


function loadRules() {
  setContent(`
    <h2 class="text-xl font-bold mb-4">📜 Reglas</h2>

    <div class="space-y-3 text-slate-700">
      <h3 class="font-bold">Pronósticos de partidos</h3>

      <p><strong>Resultado acertado:</strong> 1 punto</p>
      <p><strong>Marcador exacto:</strong> 1 punto adicional</p>

      <div class="bg-slate-100 rounded-xl p-3">
        <p><strong>Ejemplo marcador exacto:</strong></p>
        <p>Pronóstico: 2-1</p>
        <p>Resultado: 2-1</p>
        <p>Total: 2 puntos</p>
      </div>

      <div class="bg-slate-100 rounded-xl p-3">
        <p><strong>Ejemplo resultado acertado:</strong></p>
        <p>Pronóstico: 3-2</p>
        <p>Resultado: 2-1</p>
        <p>Total: 1 punto</p>
      </div>

      <p>
        Los pronósticos de partidos se bloquean 1 minuto antes del inicio de cada encuentro.
      </p>

      <h3 class="font-bold mt-4">Pronósticos Especiales</h3>

      <ul class="list-disc list-inside">
        <li>Campeón acertado: 5 puntos</li>
        <li>Subcampeón acertado: 3 puntos</li>
        <li>Tercer lugar acertado: 2 puntos</li>
        <li>Máximo goleador acertado: 5 puntos</li>
      </ul>

      <p>
        Los Pronósticos Especiales pueden modificarse hasta el inicio del primer partido del torneo.
      </p>

      <h3 class="font-bold mt-4">Desempates</h3>

      <ol class="list-decimal list-inside space-y-1">
        <li>Mayor cantidad de puntos totales.</li>
        <li>Mayor cantidad de puntos obtenidos en Pronósticos Especiales.</li>
        <li>Mayor cantidad de marcadores exactos acertados.</li>
        <li>Mayor cantidad de resultados acertados.</li>
        <li>Fecha más antigua de última modificación de pronósticos.</li>
      </ol>

      <p>
        Si el empate persiste después de aplicar todos los criterios anteriores,
        los participantes compartirán la misma posición y cualquier premio
        correspondiente se repartirá entre ellos.
      </p>
    </div>
  `);
}

function loadFAQ() {
  setContent(`
    <h2 class="text-xl font-bold mb-4">❓ FAQ</h2>

    <div class="space-y-4 text-slate-700">

      <div>
        <p class="font-bold">¿Cómo gano puntos?</p>
        <p>
          Resultado correcto = 1 punto. Marcador exacto = 1 punto adicional.
        </p>
      </div>

      <div>
        <p class="font-bold">¿Cuánto valen los Pronósticos Especiales?</p>
        <p>
          Campeón = 5 puntos, Subcampeón = 3 puntos,
          Tercer lugar = 2 puntos y Máximo goleador = 5 puntos.
        </p>
      </div>

      <div>
        <p class="font-bold">¿Hasta cuándo puedo modificar mis pronósticos?</p>
        <p>
          Cada partido puede modificarse hasta 1 minuto antes de su inicio.
        </p>
      </div>

      <div>
        <p class="font-bold">¿Hasta cuándo puedo cambiar mis especiales?</p>
        <p>
          Los Pronósticos Especiales pueden modificarse hasta el inicio del primer partido del torneo.
        </p>
      </div>

      <div>
        <p class="font-bold">¿Debo guardar cada partido?</p>
        <p>
          No. Utiliza el botón "Guardar Todo" para registrar todos tus cambios.
        </p>
      </div>

      <div>
        <p class="font-bold">¿Por qué un partido aparece bloqueado?</p>
        <p>
          Porque falta 1 minuto o menos para que inicie, o porque el partido ya comenzó.
        </p>
      </div>

      <div>
        <p class="font-bold">¿Cómo se calculan los premios?</p>
        <p>
          Los montos mostrados son estimados y se actualizan automáticamente conforme aumenta el número de participantes con pago confirmado.
        </p>
      </div>

      <div>
        <p class="font-bold">¿La clasificación se actualiza automáticamente?</p>
        <p>
          Sí. La clasificación se actualiza conforme se registran resultados oficiales de los partidos y de los Pronósticos Especiales.
        </p>
      </div>

      <div>
        <p class="font-bold">¿Qué pasa si hay empate?</p>
        <p>
          Los empates se resuelven utilizando, en orden: puntos totales,
          puntos de Pronósticos Especiales, marcadores exactos,
          resultados acertados y fecha de última modificación.
          Si el empate persiste, los participantes compartirán la misma posición
          y el premio correspondiente se repartirá entre ellos.
        </p>
      </div>

    </div>
  `);
}
