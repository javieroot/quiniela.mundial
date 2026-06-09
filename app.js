const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = JSON.parse(localStorage.getItem("pronostix_user"));

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function app() {
  if (!currentUser) return renderAuth();
  renderDashboard();
}

function html(view) {
  document.getElementById("app").innerHTML = view;
}

function renderAuth() {
  html(`
    <div class="bg-white rounded-2xl shadow p-6 max-w-md mx-auto mt-10">
      <h1 class="text-3xl font-bold mb-1">🏆 Pronostix</h1>
      <p class="text-slate-500 mb-6">Mundial FIFA 2026</p>

      <h2 class="font-bold mb-2">Entrar</h2>
      <input id="loginUsername" class="border p-2 rounded w-full mb-2" placeholder="Usuario">
      <input id="loginPassword" class="border p-2 rounded w-full mb-3" type="password" placeholder="Contraseña">
      <button onclick="loginUser()" class="bg-blue-600 text-white rounded p-2 w-full mb-6">Entrar</button>

      <h2 class="font-bold mb-2">Registro</h2>
      <input id="username" class="border p-2 rounded w-full mb-2" placeholder="Usuario">
      <input id="displayName" class="border p-2 rounded w-full mb-2" placeholder="Nombre visible">
      <input id="password" class="border p-2 rounded w-full mb-3" type="password" placeholder="Contraseña">
      <button onclick="registerUser()" class="bg-emerald-600 text-white rounded p-2 w-full">Registrar</button>
    </div>
  `);
}

async function registerUser() {
  const username = document.getElementById("username").value.trim();
  const displayName = document.getElementById("displayName").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !displayName || !password) return alert("Completa todos los campos");

  const { data: existingUser } = await client.from("users").select("id").eq("username", username).maybeSingle();
  if (existingUser) return alert("Ese usuario ya existe");

  const hash = await sha256(password);

  const { data: userData, error: userError } = await client
    .from("users")
    .insert({ username, display_name: displayName })
    .select()
    .single();

  if (userError) return alert(userError.message);

  const { error: credError } = await client
    .from("credentials")
    .insert({ user_id: userData.id, password_hash: hash });

  if (credError) return alert(credError.message);

  alert("Usuario creado. Ahora inicia sesión.");
}

async function loginUser() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const hash = await sha256(password);

  const { data: user, error } = await client.from("users").select("*").eq("username", username).single();
  if (error || !user) return alert("Usuario no encontrado");

  const { data: cred } = await client.from("credentials").select("*").eq("user_id", user.id).single();
  if (!cred || cred.password_hash !== hash) return alert("Contraseña incorrecta");

  localStorage.setItem("pronostix_user", JSON.stringify(user));
  currentUser = user;
  app();
}

function logout() {
  localStorage.removeItem("pronostix_user");
  currentUser = null;
  app();
}

async function renderDashboard() {
  const status = currentUser.payment_status === "PAID" ? "🟢 Pago Confirmado" : "🟡 Pago Pendiente";

  html(`
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="text-3xl font-bold">🏆 Pronostix</h1>
        <p class="text-slate-500">Mundial FIFA 2026</p>
      </div>
      <button onclick="logout()" class="bg-slate-800 text-white px-3 py-2 rounded">Salir</button>
    </div>

    <div class="bg-white rounded-2xl shadow p-4 mb-4">
      <h2 class="text-xl font-bold">${currentUser.display_name}</h2>
      <p>${status}</p>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <button onclick="loadOfficial()" class="bg-blue-600 text-white rounded-xl p-3">Clasificación Oficial</button>
      <button onclick="loadGeneral()" class="bg-indigo-600 text-white rounded-xl p-3">Clasificación General</button>
      <button onclick="loadPredictions()" class="bg-emerald-600 text-white rounded-xl p-3">Mis Pronósticos</button>
      <button onclick="loadSpecials()" class="bg-amber-500 text-white rounded-xl p-3">Especiales</button>
      ${currentUser.is_admin ? `<button onclick="loadAdmin()" class="bg-red-600 text-white rounded-xl p-3 col-span-2">Admin</button>` : ""}
    </div>

    <div id="content" class="bg-white rounded-2xl shadow p-4">
      <p>Selecciona una opción.</p>
    </div>
  `);
}

async function loadOfficial() {
  const { data } = await client.from("users").select("*").eq("payment_status", "PAID");
  renderUsers(data, "Clasificación Oficial");
}

async function loadGeneral() {
  const { data } = await client.from("users").select("*");
  renderUsers(data, "Clasificación General");
}

function renderUsers(users, title) {
  document.getElementById("content").innerHTML = `
    <h2 class="text-xl font-bold mb-3">${title}</h2>
    <table class="w-full text-sm">
      <tr class="border-b">
        <th class="text-left">#</th>
        <th class="text-left">Nombre</th>
        <th class="text-left">Estado</th>
      </tr>
      ${users.map((u, i) => `
        <tr class="border-b">
          <td>${i + 1}</td>
          <td>${u.display_name}</td>
          <td>${u.payment_status === "PAID" ? "🟢 Pagado" : "🟡 Pendiente"}</td>
        </tr>
      `).join("")}
    </table>
    <p class="text-xs text-slate-500 mt-3">
      La clasificación oficial considera únicamente participantes con pago confirmado.
    </p>
  `;
}

async function loadPredictions() {
  const { data: matches } = await client.from("matches").select("*").order("match_date");

  document.getElementById("content").innerHTML = `
    <h2 class="text-xl font-bold mb-3">Mis Pronósticos</h2>
    ${!matches.length ? `<p>No hay partidos cargados todavía.</p>` : ""}
    ${matches.map(m => `
      <div class="border rounded-xl p-3 mb-3">
        <p class="font-bold">${m.home_team} vs ${m.away_team}</p>
        <p class="text-xs text-slate-500">${new Date(m.match_date).toLocaleString()}</p>
        <div class="flex gap-2 mt-2">
          <input id="h_${m.id}" type="number" class="border rounded p-2 w-20" placeholder="${m.home_team}">
          <input id="a_${m.id}" type="number" class="border rounded p-2 w-20" placeholder="${m.away_team}">
          <button onclick="savePrediction(${m.id})" class="bg-emerald-600 text-white rounded px-3">Guardar</button>
        </div>
      </div>
    `).join("")}
  `;
}

async function savePrediction(matchId) {
  const home = Number(document.getElementById(`h_${matchId}`).value);
  const away = Number(document.getElementById(`a_${matchId}`).value);

  const { error } = await client.from("predictions").upsert({
    user_id: currentUser.id,
    match_id: matchId,
    home_prediction: home,
    away_prediction: away
  }, { onConflict: "user_id,match_id" });

  if (error) return alert(error.message);
  alert("Pronóstico guardado");
}

async function loadSpecials() {
  document.getElementById("content").innerHTML = `
    <h2 class="text-xl font-bold mb-3">Pronósticos Especiales</h2>
    <input id="champion" class="border rounded p-2 w-full mb-2" placeholder="Campeón">
    <input id="runnerUp" class="border rounded p-2 w-full mb-2" placeholder="Subcampeón">
    <input id="thirdPlace" class="border rounded p-2 w-full mb-2" placeholder="Tercer lugar">
    <input id="topScorer" class="border rounded p-2 w-full mb-3" placeholder="Máximo goleador">
    <button onclick="saveSpecials()" class="bg-amber-500 text-white rounded p-2 w-full">Guardar especiales</button>
  `;
}

async function saveSpecials() {
  const { error } = await client.from("special_predictions").upsert({
    user_id: currentUser.id,
    champion: document.getElementById("champion").value.trim(),
    runner_up: document.getElementById("runnerUp").value.trim(),
    third_place: document.getElementById("thirdPlace").value.trim(),
    top_scorer: document.getElementById("topScorer").value.trim()
  }, { onConflict: "user_id" });

  if (error) return alert(error.message);
  alert("Pronósticos especiales guardados");
}

async function loadAdmin() {
  const { data: users } = await client.from("users").select("*").order("created_at");

  document.getElementById("content").innerHTML = `
    <h2 class="text-xl font-bold mb-3">Administración</h2>
    ${users.map(u => `
      <div class="border rounded-xl p-3 mb-2">
        <p class="font-bold">${u.display_name}</p>
        <p class="text-sm">${u.username} - ${u.payment_status}</p>
        <button onclick="togglePayment('${u.id}', '${u.payment_status}')" class="bg-blue-600 text-white rounded px-3 py-1 mt-2">
          Cambiar pago
        </button>
      </div>
    `).join("")}
  `;
}

async function togglePayment(userId, status) {
  const next = status === "PAID" ? "PENDING" : "PAID";

  const { error } = await client
    .from("users")
    .update({ payment_status: next })
    .eq("id", userId);

  if (error) return alert(error.message);

  alert("Estado actualizado");
  loadAdmin();
}

app();
