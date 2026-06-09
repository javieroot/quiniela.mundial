const client = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

async function sha256(text) {

    const data = new TextEncoder().encode(text);

    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        data
    );

    return Array
    .from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

document
.getElementById("registerBtn")
.addEventListener("click", registerUser);

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

    const output =
    document
    .getElementById("output");

    output.textContent = "Registrando...";

    if (!username || !displayName || !password) {

        output.textContent =
        "Todos los campos son obligatorios";

    return;
    }

    const { data: existingUser } = await client
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

    if (existingUser) {

        output.textContent =
        "El usuario ya existe";

    return;
    }

    const hash = await sha256(password);

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

        output.textContent =
        JSON.stringify(
            userError,
            null,
            2
        );

        return;
    }

    const {
        error: credentialError
    } = await client
    .from("credentials")
    .insert({
        user_id: userData.id,
        password_hash: hash
    });

    if (credentialError) {

        output.textContent =
        JSON.stringify(
            credentialError,
            null,
            2
        );

        return;
    }

    output.textContent =
    "Usuario registrado correctamente";

    document
    .getElementById("username")
    .value = "";

    document
    .getElementById("displayName")
    .value = "";

    document
    .getElementById("password")
    .value = "";
}
