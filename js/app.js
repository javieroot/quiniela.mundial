function renderApp() {
  if (!currentUser) {
    renderAuth();
    return;
  }

  renderDashboard();
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("Pronostix iniciado");
  renderApp();
});
