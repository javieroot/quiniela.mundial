```javascript
const client = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let currentUser =
    JSON.parse(
        localStorage.getItem("pronostix_user")
    );

async function sha256(text) {

    const data =
        new TextEncoder().encode(text);

    const hash =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );

    return Array
        .from(new Uint8Array(hash))
        .map(b =>
            b.toString(16).padStart(2, "0")
        )
        .join("");
}

function renderApp() {

    if (!currentUser) {
        renderAuth();
        return;
    }

    renderDashboard();
}

function render(view) {

    const container =
        document.getElementById("app");

    if (!container) {
        console.error("No existe #app");
        return;
    }

    container.innerHTML = view;
}

function renderAuth() {

    render(`
        <div class="bg-white rounded-2xl shadow p-6 max-w-md mx-auto mt-10">

            <h1 class="text-3xl font-bold mb-1">
                🏆 Pronostix
            </h1>

            <p class="text-slate-500 mb-6">
                Mundial FIFA 2026
            </p>

            <h2 class="font-bold mb-2">
                Entrar
            </h2>

            <input
                id="loginUsername"
                class="border p-2 rounded w-full mb-2"
                placeholder="Usuario"
            >

            <input
                id="loginPassword"
                class="border p-2 rounded w-full mb-3"
                type="password"
                placeholder="Contraseña"
            >

            <button
                onclick="loginUser()"
                class="bg-blue-600 text-white rounded p-2 w-full mb-6"
            >
                Entrar
            </button>

            <h2 class="font-bold mb-2">
                Registro
            </h2>

            <input
                id="username"
                class="border p-2 rounded w-full mb-2"
                placeholder="Usuario"
            >

            <input
                id="displayName"
                class="border p-2 rounded w-full mb-2"
                placeholder="Nombre visible"
            >

            <input
                id="password"
                class="border p-2 rounded w-full mb-3"
                type="password"
                placeholder="Contraseña"
            >

            <button
                onclick="registerUser()"
                class="bg-emerald-600 text-white rounded p-2 w-full"
            >
                Registrar
            </button>

        </div>
    `);
}

async function registerUser() {

    const username =
        document
            .getElementById("username")
            .value
            .trim();

    const displayName =
        document
            .getElementById("displayName")
            .value
            .trim();

    const password =
        document
            .getElementById("password")
            .value;

    if (!username ||
        !displayName ||
        !password) {

        return alert(
            "Completa todos los campos"
        );
    }

    const {
        data: existingUser
    } = await client
        .from("users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    if (existingUser) {
        return alert(
            "Ese usuario ya existe"
        );
    }

    const hash =
        await sha256(password);

    const {
        data: userData,
        error: userError
    } = await client
        .from("users")
        .insert({
            username,
            display_name: displayName
        })
        .select()
        .single();

    if (userError) {
        return alert(
            userError.message
        );
    }

    const {
        error: credError
    } = await client
        .from("credentials")
        .insert({
            user_id: userData.id,
            password_hash: hash
        });

    if (credError) {
        return alert(
            credError.message
        );
    }

    alert(
        "Usuario creado correctamente"
    );
}

async function loginUser() {

    const username =
        document
            .getElementById("loginUsername")
            .value
            .trim();

    const password =
        document
            .getElementById("loginPassword")
            .value;

    const hash =
        await sha256(password);

    const {
        data: user,
        error
    } = await client
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

    if (error || !user) {
        return alert(
            "Usuario no encontrado"
        );
    }

    const {
        data: credential
    } = await client
        .from("credentials")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (!credential ||
        credential.password_hash !== hash) {

        return alert(
            "Contraseña incorrecta"
        );
    }

    localStorage.setItem(
        "pronostix_user",
        JSON.stringify(user)
    );

    currentUser = user;

    renderApp();
}

function logout() {

    localStorage.removeItem(
        "pronostix_user"
    );

    currentUser = null;

    renderApp();
}

function renderDashboard() {

    const status =
        currentUser.payment_status === "PAID"
            ? "🟢 Pago Confirmado"
            : "🟡 Pago Pendiente";

    render(`
        <div class="max-w-5xl mx-auto p-4">

            <div class="flex justify-between items-center mb-4">

                <div>
                    <h1 class="text-3xl font-bold">
                        🏆 Pronostix
                    </h1>

                    <p class="text-slate-500">
                        Mundial FIFA 2026
                    </p>
                </div>

                <button
                    onclick="logout()"
                    class="bg-slate-800 text-white px-3 py-2 rounded"
                >
                    Salir
                </button>

            </div>

            <div class="bg-white rounded-2xl shadow p-4">

                <h2 class="text-xl font-bold">
                    ${currentUser.display_name}
                </h2>

                <p>${status}</p>

            </div>

        </div>
    `);
}

window.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log("DOM LISTO");

        renderApp();

    }
);
```
