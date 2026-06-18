(function () {
  const P = window.Pronostix;
  const navItems = [
    ["dashboard", "Inicio"],
    ["predictions", "Pronósticos"],
    ["specials", "Especiales"],
    ["general", "Ranking general"],
    ["official", "Ranking oficial"],
    ["rules", "Reglas/FAQ"]
  ];

  function badge(status) {
    return status === "PAID"
      ? "<span class='badge badge-paid'>PAGADO</span>"
      : "<span class='badge badge-pending'>NO PAGADO</span>";
  }

  function userChip(user, showUsername = false) {
    return `<span class="user-chip">
      ${P.avatarHtml(user, "sm")}
      <span>
        <b>${P.esc(user?.display_name || "Usuario")}</b>
        ${showUsername && user?.username ? `<small>@${P.esc(user.username)}</small>` : ""}
      </span>
    </span>`;
  }

  function shell(content) {
    const profile = P.state.profile;
    const items = [...navItems];
    if (profile?.is_admin) items.push(["admin", "Administración"]);

    P.app.innerHTML = `<div id="toast" class="hidden"></div>
      <header class="site-header">
        <div class="layout header-inner">
          <div>
            <h1 class="brand">${P.esc(P.cfg.platformName || "Pronostix")}</h1>
            <p class="user-line">${profile ? `${userChip(profile)} · ${badge(profile.payment_status)}` : ""}</p>
          </div>
          <nav class="nav">
            ${items.map(([id, label]) => `<button class="nav-btn ${P.state.view === id ? "active" : ""}" onclick="PronostixApp.go('${id}')">${label}</button>`).join("")}
            <button class="nav-btn danger" onclick="PronostixAuth.logout()">Salir</button>
          </nav>
        </div>
      </header>
      <main class="layout page">${content}</main>`;
  }

  function loading(text = "Cargando...") {
    P.app.innerHTML = `<main class="layout page">
      <section class="card p-6">${P.esc(text)}</section>
    </main>`;
  }

  function configMissing() {
    P.app.innerHTML = `<main class="auth-page">
      <section class="card auth-card">
        <h1 class="auth-title">Pronostix</h1>
        <p class="auth-subtitle">Falta configuración.</p>
        <p>Copia <code>config.example.js</code> a <code>config.js</code> y configura <b>supabaseUrl</b>, <b>supabaseAnonKey</b> y <b>siteUrl</b>.</p>
        <p class="mt-3 text-sm text-slate-500">Nunca pongas la llave de servicio en el frontend.</p>
      </section>
    </main>`;
  }

  function emptyState(title, text) {
    return `<section class="card p-6 text-center">
      <h2 class="text-xl font-black">${P.esc(title)}</h2>
      <p class="text-slate-600 mt-2">${P.esc(text)}</p>
    </section>`;
  }

  function optionList(items, selected, label = "Selecciona") {
    return `<option value="">${P.esc(label)}</option>${items.map(item => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${P.esc(item.name)}</option>`).join("")}`;
  }

  function autocompleteField({ id, label, items, selected, placeholder = "Busca y selecciona", labelFn = item => item.name, disabled = false, help = "Escribe para buscar y selecciona una opción de la lista." }) {
    const listId = `${id}-options`;
    const selectedItem = items.find(item => item.id === selected);
    const selectedLabel = selectedItem ? labelFn(selectedItem) : "";
    return `<label class="autocomplete-field">${P.esc(label)}
      <input id="${id}Search" class="input autocomplete-input" list="${listId}" value="${P.esc(selectedLabel)}" placeholder="${P.esc(placeholder)}" data-autocomplete-target="${id}" data-autocomplete-list="${listId}" oninput="PronostixUI.syncAutocomplete(this)" onchange="PronostixUI.syncAutocomplete(this)" ${disabled ? "disabled" : ""}>
      <input id="${id}" type="hidden" value="${P.esc(selected || "")}">
      <datalist id="${listId}">${items.map(item => `<option value="${P.esc(labelFn(item))}" data-id="${P.esc(item.id)}"></option>`).join("")}</datalist>
      <small class="autocomplete-help">${P.esc(help)}</small>
    </label>`;
  }

  function syncAutocomplete(input) {
    const target = document.getElementById(input?.dataset?.autocompleteTarget || "");
    const list = document.getElementById(input?.dataset?.autocompleteList || "");
    if (!target || !list) return;
    const value = String(input.value || "").trim().toLowerCase();
    const option = [...list.options].find(item => String(item.value || "").trim().toLowerCase() === value);
    target.value = option?.dataset?.id || "";
  }

  window.PronostixUI = {
    shell,
    loading,
    configMissing,
    emptyState,
    optionList,
    autocompleteField,
    syncAutocomplete,
    badge,
    userChip
  };
}());
