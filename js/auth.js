function renderAuth() {
  render(`
    <div class="bg-white rounded-2xl shadow p-6 max-w-md mx-auto mt-10">
      <h1 class="text-3xl font-bold mb-1">🏆 ${PRONOSTIX_CONFIG.platformName}</h1>
      <p class="text-slate-500 mb-6">${PRONOSTIX_CONFIG.tournamentName}</p>

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
  if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) return alert("El usuario debe tener 4 a 20 caracteres y solo usar letras, números o guion bajo");
  if (displayName.length < 3 || displayName.length > 40) return alert("El nombre visible debe tener entre 3 y 40 caracteres");
  if (password.length < 6) return alert("La contraseña debe tener mínimo 6 caracteres");

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

  alert("Usuario creado correctamente. Ahora inicia sesión.");
}

async function loginUser() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const hash = await sha256(password);

  const { data: user, error } = await client.from("users").select("*").eq("username", username).single();
  if (error || !user) return alert("Usuario no encontrado");

  const { data: credential } = await client.from("credentials").select("*").eq("user_id", user.id).single();
  if (!credential || credential.password_hash !== hash) return alert("Contraseña incorrecta");

  setCurrentUser(user);
  renderApp();
}

function logout() {
  setCurrentUser(null);
  renderApp();
}
