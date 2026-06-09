async function refreshCurrentUser() {
  if (!currentUser) return;

  const { data } = await client
    .from("users")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (data) {
    setCurrentUser(data);
  }
}

async function renderApp() {
  if (!currentUser) {
    renderAuth();
    return;
  }

  await refreshCurrentUser();

  if (currentUser.must_change_password) {
    renderForcePasswordChange();
    return;
  }

  renderDashboard();
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("Pronostix iniciado");
  renderApp();
});
