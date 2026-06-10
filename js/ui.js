(function () {
  const P = window.Pronostix;
  const navItems = [["dashboard", "Inicio"], ["predictions", "Pronósticos"], ["specials", "Especiales"], ["general", "Ranking general"], ["official", "Ranking oficial"], ["rules", "Reglas/FAQ"]];

  function badge(status) {
    return status === "PAID" ? "<span class='badge badge-paid'>PAGADO</span>" : "<span class='badge badge-pending'>NO PAGADO</span>";
  }

  function shell(content) {
    const profile = P.state.profile;
    const items = [...navItems];
    if (profile?.is_admin) items.push(["admin", "Admin"]);
    P.app.innerHTML = `<div id="toast" class="hidden"></div>
      <header class="site-header"><div class="layout header-inner">
        <div><h1 class="brand">${P.esc(P.cfg.platformName || "Pronostix")}</h1><p class="user-line">${P.esc(profile?.display_name || "")} ${profile ? `· ${badge(profile.payment_status)}` : ""}</p></div>
        <nav class="nav">${items.map(([id, label]) => `<button class="nav-btn ${P.state.view === id ? "active" : ""}" onclick="PronostixApp.go('${id}')">${label}</button>`).join("")}<button class="nav-btn danger" onclick="PronostixAuth.logout()">Salir</button></nav>
      </div></header><main class="layout page">${content}</main>`;
  }

  function loading(text = "Cargando...") {
    P.app.innerHTML = `<main class="layout page"><section class="card p-6">${P.esc(text)}</section></main>`;
  }

  function configMissing() {
    P.app.innerHTML = `<main class="auth-page"><section class="card auth-card">
      <h1 class="auth-title">Pronostix</h1>
      <p class="auth-subtitle">Falta configuración.</p>
      <p>Copia <code>config.example.js</code> a <code>config.js</code> y configura <b>supabaseUrl</b>, <b>supabaseAnonKey</b> y <b>siteUrl</b>.</p>
      <p class="mt-3 text-sm text-slate-500">Nunca pongas service_role en frontend.</p>
    </section></main>`;
  }

  function emptyState(title, text) {
    return `<section class="card p-6 text-center"><h2 class="text-xl font-black">${P.esc(title)}</h2><p class="text-slate-600 mt-2">${P.esc(text)}</p></section>`;
  }

  function optionList(items, selected, label = "Selecciona") {
    return `<option value="">${P.esc(label)}</option>${items.map(item => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${P.esc(item.name)}</option>`).join("")}`;
  }

  window.PronostixUI = { shell, loading, configMissing, emptyState, optionList, badge };
}());
