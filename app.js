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

    try {

        const username =
        document.getElementById("username").value.trim();

        const displayName =
        document.getElementById("displayName").value.trim();

        const password =
        document.getElementById("password").value;

        console.log("username", username);
        console.log("displayName", displayName);

        const { data: existingUser, error: existingError } =
        await client
        .from("users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

        console.log("existingUser", existingUser);
        console.log("existingError", existingError);

        if (existingUser) {
            alert("Usuario ya existe");
            return;
        }

        const hash = await sha256(password);

        console.log("hash", hash);

        const {
            data: userData,
            error: userError
        } = await client
        .from("users")
        .insert({
            username,
            display_name: displayName
        })
        .select();

        console.log("userData", userData);
        console.log("userError", userError);

        if (userError) {
            alert(JSON.stringify(userError));
            return;
        }

        const userId = userData[0].id;

        const {
            data: credentialData,
            error: credentialError
        } = await client
        .from("credentials")
        .insert({
            user_id: userId,
            password_hash: hash
        })
        .select();

        console.log("credentialData", credentialData);
        console.log("credentialError", credentialError);

        if (credentialError) {
            alert(JSON.stringify(credentialError));
            return;
        }

        alert("Usuario creado");

    } catch (err) {

        console.error(err);
        alert(err.message);

    }
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
console.log("APP CARGADA");
