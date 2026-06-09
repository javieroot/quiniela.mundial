const client = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

async function loadUsers() {

    const { data, error } = await client
    .from("users")
    .select("*");

    document.getElementById("output")
    .textContent =
    JSON.stringify(
        { data, error },
        null,
        2
    );
}

loadUsers();
