const client = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("APP CARGADA");

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

async function registerUser() {

    try {

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

        if (!username || !displayName || !password) {
            alert("Todos los campos son obligatorios");
            return;
        }

        const {
            data: existingUser,
            error: existingError
        } = await client
            .from("users")
            .select("id")
            .eq("username", username)
            .maybeSingle();

        if (existingError) {
            alert(JSON.stringify(existingError));
            return;
        }

        if (existingUser) {
            alert("El usuario ya existe");
            return;
        }

        const hash = await sha256(password);

        const {
            data: userData,
            error: userError
        } = await client
            .from("users")
            .insert({
                username: username,
                display_name: displayName
            })
            .select();

        if (userError) {
            alert(JSON.stringify(userError));
            return;
        }

        const userId = userData[0].id;

        const {
            error: credentialError
        } = await client
            .from("credentials")
            .insert({
                user_id: userId,
                password_hash: hash
            });

        if (credentialError) {
            alert(JSON.stringify(credentialError));
            return;
        }

        alert("Usuario creado correctamente");

        document.getElementById("username").value = "";
        document.getElementById("displayName").value = "";
        document.getElementById("password").value = "";

    } catch (err) {

        console.error(err);
        alert(err.message);

    }
}

async function loginUser() {

    try {

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
            error: userError
        } = await client
            .from("users")
            .select("*")
            .eq("username", username)
            .single();

        if (userError || !user) {

            alert("Usuario no encontrado");
            return;
        }

        const {
            data: credential,
            error: credentialError
        } = await client
            .from("credentials")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (credentialError || !credential) {

            alert("Credenciales inválidas");
            return;
        }

        if (credential.password_hash !== hash) {

            alert("Contraseña incorrecta");
            return;
        }

        localStorage.setItem(
            "pronostix_user",
            JSON.stringify(user)
        );

        alert(
            "Bienvenido " +
            user.display_name
        );

    } catch (err) {

        console.error(err);
        alert(err.message);

    }
}

window.addEventListener("DOMContentLoaded", () => {

    console.log("DOM LISTO");

    const registerBtn =
        document.getElementById("registerBtn");

    const loginBtn =
        document.getElementById("loginBtn");

    if (registerBtn) {
        registerBtn.addEventListener(
            "click",
            registerUser
        );
    }

    if (loginBtn) {
        loginBtn.addEventListener(
            "click",
            loginUser
        );
    }

});
