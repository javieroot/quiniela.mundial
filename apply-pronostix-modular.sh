set -e

mkdir -p js css docs

# Borra restos de la versión vieja/monolítica
rm -f app.js
rm -f js/prizes.js js/standings.js js/state.js js/supabaseClient.js js/utils.js

cat > index.html <<'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pronostix</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <link rel="stylesheet" href="css/styles.css?v=20260610c" />
</head>
<body class="bg-slate-100 text-slate-900">
  <div id="app" class="min-h-screen"></div>
  <script src="config.js?v=20260610c"></script>
  <script src="js/core.js?v=20260610c"></script>
  <script src="js/data.js?v=20260610c"></script>
  <script src="js/ui.js?v=20260610c"></script>
  <script src="js/auth.js?v=20260610c"></script>
  <script src="js/dashboard.js?v=20260610c"></script>
  <script src="js/predictions.js?v=20260610c"></script>
  <script src="js/specials.js?v=20260610c"></script>
  <script src="js/rankings.js?v=20260610c"></script>
  <script src="js/rules.js?v=20260610c"></script>
  <script src="js/admin.js?v=20260610c"></script>
  <script src="js/app.js?v=20260610c"></script>
</body>
</html>
EOF

cat > js/core.js <<'EOF'
(function () {
  const cfg = window.PRONOSTIX_CONFIG || {};
  const app = document.getElementById("app");
  const hasSupabase = Boolean(window.supabase?.createClient);
  const sb = hasSupabase ? window.supabase.createClient(cfg.supabaseUrl || "", cfg.supabaseAnonKey || "") : null;
  const state = { session: null, profile: null, view: "dashboard", tournaments: [], activeTournament: null, settings: null, needsPasswordUpdate: false, cache: {} };

  const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n || 0));
  const dt = (v) => v ? new Date(v).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "";
  const val = (id) => document.getElementById(id)?.value?.trim();
  const num = (v, fallback = null) => v === "" || v == null || Number.isNaN(Number(v)) ? fallback : Number(v);
  const esc = (s) => String(s ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const lockMinutes = () => Math.max(0, Number(state.settings?.lock_minutes_before_match ?? 1));
  const siteUrl = () => (cfg.siteUrl || window.location.origin + window.location.pathname).replace(/#.*$/, "");
  const friendlyError = (message) => {
    const text = String(message || "Error desconocido.");
    if (text.includes("Database error querying schema")) return "Supabase no encuentra el esquema esperado. Ejecuta sql/schema.sql en el proyecto correcto y revisa config.js.";
    if (text.includes("JWT") || text.includes("Invalid API key")) return "La anon key o la URL de Supabase no coinciden. Revisa config.js.";
    return text;
  };
  const toast = (message, ok = true) => {
    const text = friendlyError(message);
    const el = document.getElementById("toast");
    if (!el) return console[ok ? "log" : "error"](text);
    el.textContent = text;
    el.className = `toast ${ok ? "toast-ok" : "toast-error"}`;
    setTimeout(() => { el.className = "hidden"; }, 5200);
  };
  const requireConfig = () => Boolean(hasSupabase && sb && cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.siteUrl && !cfg.supabaseUrl.includes("TU-PROYECTO"));

  window.Pronostix = { cfg, app, sb, state, money, dt, val, num, esc, lockMinutes, siteUrl, toast, friendlyError, requireConfig };
}());
EOF

cat > js/data.js <<'EOF'
(function () {
  const P = window.Pronostix;

  async function loadProfile() {
    P.state.profile = null;
    if (!P.state.session?.user) return null;
    const { data, error } = await P.sb.from("profiles").select("*").eq("id", P.state.session.user.id).maybeSingle();
    if (error) P.toast(error.message, false);
    P.state.profile = data || null;
    return P.state.profile;
  }

  async function loadBase() {
    if (!P.state.session) return;
    const [{ data: tournaments, error: tournamentError }, { data: settings, error: settingsError }] = await Promise.all([
      P.sb.from("tournaments").select("*").order("starts_at"),
      P.sb.from("settings").select("*").eq("id", 1).maybeSingle()
    ]);
    if (tournamentError) P.toast(tournamentError.message, false);
    if (settingsError) P.toast(settingsError.message, false);
    P.state.tournaments = tournaments || [];
    P.state.activeTournament = P.state.tournaments.find(t => t.is_active) || P.state.tournaments[0] || null;
    P.state.settings = settings || null;
  }

  async function getTournamentData() {
    const tid = P.state.activeTournament?.id;
    if (!tid) return { teams: [], players: [], matches: [] };
    const [teams, players, matches] = await Promise.all([
      P.sb.from("teams").select("*").eq("tournament_id", tid).order("name"),
      P.sb.from("players").select("*").eq("tournament_id", tid).order("name"),
      P.sb.from("matches").select("*, home_team:teams!matches_home_team_id_fkey(id,name,short_name), away_team:teams!matches_away_team_id_fkey(id,name,short_name)").eq("tournament_id", tid).order("kickoff_at")
    ]);
    if (teams.error) P.toast(teams.error.message, false);
    if (players.error) P.toast(players.error.message, false);
    if (matches.error) P.toast(matches.error.message, false);
    return { teams: teams.data || [], players: players.data || [], matches: matches.data || [] };
  }

  async function loadAllForRanking() {
    const tid = P.state.activeTournament?.id;
    const [profiles, matches, predictions, specialPredictions, specialResults] = await Promise.all([
      P.sb.from("profiles").select("id,username,display_name,payment_status,created_at,updated_at"),
      P.sb.from("matches").select("*").eq("tournament_id", tid),
      P.sb.from("predictions").select("*"),
      P.sb.from("special_predictions").select("*").eq("tournament_id", tid),
      P.sb.from("special_results").select("*").eq("tournament_id", tid).maybeSingle()
    ]);
    [profiles, matches, predictions, specialPredictions, specialResults].forEach(result => { if (result.error) P.toast(result.error.message, false); });
    return {
      profiles: profiles.data || [],
      matches: matches.data || [],
      predictions: predictions.data || [],
      specialPredictions: specialPredictions.data || [],
      specialResults: specialResults.data || null
    };
  }

  window.PronostixData = { loadProfile, loadBase, getTournamentData, loadAllForRanking };
}());
EOF

cat > js/ui.js <<'EOF'
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
EOF

cat > js/auth.js <<'EOF'
(function () {
  const P = window.Pronostix;

  function renderAuth(mode = "login") {
    const isRegister = mode === "register";
    const isReset = mode === "reset";
    P.app.innerHTML = `<main class="auth-page"><section class="card auth-card"><h1 class="auth-title">Pronostix</h1><p class="auth-subtitle">Tu quiniela familiar, limpia y segura.</p><div class="stack">${isRegister ? registerForm() : isReset ? resetForm() : loginForm()}</div></section></main>`;
  }

  const loginForm = () => `<input id="email" class="input" placeholder="Email" type="email" autocomplete="email">
    <input id="password" class="input" placeholder="Contraseña" type="password" autocomplete="current-password">
    <button class="btn btn-primary w-full" onclick="PronostixAuth.login()">Entrar</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('register')">Registrarme</button>
    <button class="link-btn" onclick="PronostixAuth.renderAuth('reset')">Olvidé mi contraseña</button>`;

  const registerForm = () => `<input id="email" class="input" placeholder="Email" type="email" autocomplete="email">
    <input id="username" class="input" placeholder="Username único" autocomplete="username">
    <input id="display" class="input" placeholder="Nombre visible">
    <input id="password" class="input" placeholder="Contraseña" type="password" autocomplete="new-password">
    <button class="btn btn-primary w-full" onclick="PronostixAuth.register()">Crear cuenta</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('login')">Ya tengo cuenta</button>`;

  const resetForm = () => `<input id="email" class="input" placeholder="Email" type="email" autocomplete="email">
    <button class="btn btn-primary w-full" onclick="PronostixAuth.resetPassword()">Enviar recuperación</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('login')">Volver</button>`;

  function renderUpdatePassword() {
    P.app.innerHTML = `<main class="auth-page"><section class="card auth-card"><h1 class="auth-title">Nueva contraseña</h1><p class="auth-subtitle">Captura tu nueva contraseña para terminar la recuperación.</p><div class="stack"><input id="newPassword" class="input" placeholder="Nueva contraseña" type="password" autocomplete="new-password"><input id="confirmPassword" class="input" placeholder="Confirmar contraseña" type="password" autocomplete="new-password"><button class="btn btn-primary w-full" onclick="PronostixAuth.updatePassword()">Actualizar contraseña</button><button class="btn btn-secondary w-full" onclick="PronostixAuth.logout()">Cancelar</button></div></section></main>`;
  }

  async function register() {
    const email = P.val("email");
    const password = P.val("password");
    const username = P.val("username");
    const displayName = P.val("display");
    if (!email || !password || !username || !displayName) return P.toast("Completa email, username, nombre visible y contraseña.", false);
    const { error } = await P.sb.auth.signUp({ email, password, options: { data: { username, display_name: displayName }, emailRedirectTo: P.siteUrl() } });
    P.toast(error ? error.message : "Cuenta creada. Si Supabase requiere confirmación, revisa tu email.", !error);
  }

  async function login() {
    const { error } = await P.sb.auth.signInWithPassword({ email: P.val("email"), password: P.val("password") });
    if (error) P.toast(error.message, false);
  }

  async function logout() {
    await P.sb.auth.signOut();
    P.state.session = null;
    P.state.profile = null;
    P.state.view = "dashboard";
    renderAuth();
  }

  async function resetPassword() {
    const email = P.val("email");
    if (!email) return P.toast("Escribe tu email para recuperar contraseña.", false);
    const { error } = await P.sb.auth.resetPasswordForEmail(email, { redirectTo: P.siteUrl() });
    P.toast(error ? error.message : "Email de recuperación enviado. Revisa también spam.", !error);
  }

  async function updatePassword() {
    const password = P.val("newPassword");
    if (!password || password.length < 6) return P.toast("La contraseña debe tener mínimo 6 caracteres.", false);
    if (password !== P.val("confirmPassword")) return P.toast("Las contraseñas no coinciden.", false);
    const { error } = await P.sb.auth.updateUser({ password });
    if (error) return P.toast(error.message, false);
    P.state.needsPasswordUpdate = false;
    P.state.view = "dashboard";
    history.replaceState(null, "", P.siteUrl());
    await window.PronostixData.loadProfile();
    await window.PronostixData.loadBase();
    P.toast("Contraseña actualizada.");
    window.PronostixApp.render();
  }

  window.PronostixAuth = { renderAuth, renderUpdatePassword, register, login, logout, resetPassword, updatePassword };
}());
EOF

cat > js/dashboard.js <<'EOF'
(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;

  function renderDashboard() {
    const paid = P.state.profile?.payment_status === "PAID";
    UI.shell(`<section class="hero card"><div><p class="eyebrow">Torneo activo</p><h2>${P.esc(P.state.activeTournament?.name || "Sin torneo activo")}</h2><p>Captura tus marcadores, especiales y presume el ranking con premios integrados.</p></div><div class="hero-actions"><button class="btn btn-primary" onclick="PronostixApp.go('predictions')">Pronosticar partidos</button><button class="btn btn-secondary" onclick="PronostixApp.go('specials')">Especiales</button></div></section>
    <section class="grid md:grid-cols-4 gap-4">
      <div class="card stat"><span>Estado pago</span><b>${paid ? "PAGADO" : "NO PAGADO"}</b><small>${paid ? "Participas en ranking oficial." : "Apareces en general; paga para premios oficiales."}</small></div>
      <div class="card stat"><span>Inscripción</span><b>${P.money(P.state.settings?.entry_fee)}</b><small>Costo configurado por admin.</small></div>
      <div class="card stat"><span>Bloqueo</span><b>${P.lockMinutes()} min</b><small>Antes de cada partido.</small></div>
      <div class="card stat"><span>Desempates</span><b>Sin alfabético</b><small>Total, especiales, exactos, resultados, última mod.</small></div>
    </section>
    <section class="card p-5"><h3 class="text-xl font-black">Checklist para ganar</h3><ol class="list-decimal ml-5 mt-2 text-slate-700 space-y-1"><li>Guarda marcador local/visitante antes del bloqueo.</li><li>Llena campeón, subcampeón, tercer lugar y goleador.</li><li>Revisa ranking general para presumir y ranking oficial para premios reales.</li><li>Confirma con el admin que tu estado sea PAGADO.</li></ol></section>`);
  }

  window.PronostixDashboard = { renderDashboard };
}());
EOF

cat > js/predictions.js <<'EOF'
(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  function isLocked(match) {
    return Date.now() >= new Date(match.kickoff_at).getTime() - (P.lockMinutes() * 60000);
  }

  async function renderPredictions() {
    const { matches } = await Data.getTournamentData();
    const { data: preds, error } = await P.sb.from("predictions").select("*").eq("user_id", P.state.session.user.id);
    if (error) P.toast(error.message, false);
    const byMatch = Object.fromEntries((preds || []).map(p => [p.match_id, p]));
    if (!matches.length) return UI.shell(UI.emptyState("Sin partidos", "Carga partidos desde el panel administrador o en SQL."));
    UI.shell(`<section class="card p-5"><div class="section-title"><div><h2>Pronósticos por partido</h2><p>Se bloquea ${P.lockMinutes()} minuto(s) antes de cada partido. Los bloqueados siguen visibles.</p></div><span class="pill">Auto precarga tus guardados</span></div><div class="match-list">${matches.map(match => renderMatch(match, byMatch[match.id])).join("")}</div></section>`);
  }

  function renderMatch(match, pred) {
    const locked = isLocked(match);
    const result = match.status === "FINISHED" ? `<p class="result-chip">Resultado: ${match.home_score}-${match.away_score}</p>` : "";
    return `<article class="match-card ${locked ? "locked" : "open"}"><div class="match-main"><h3>${P.esc(match.home_team?.name)} <span>vs</span> ${P.esc(match.away_team?.name)}</h3><p>${P.dt(match.kickoff_at)} · ${match.status} · ${locked ? "🔒 Bloqueado" : "🟢 Abierto"}</p><p class="lock-copy">Se bloquea ${P.lockMinutes()} minuto(s) antes del partido.</p>${result}</div><div class="score-editor"><label>${P.esc(match.home_team?.short_name || "Local")}<input id="home-${match.id}" class="input score-input" type="number" min="0" value="${pred?.home_score ?? ""}" ${locked ? "disabled" : ""}></label><span class="dash">-</span><label>${P.esc(match.away_team?.short_name || "Visita")}<input id="away-${match.id}" class="input score-input" type="number" min="0" value="${pred?.away_score ?? ""}" ${locked ? "disabled" : ""}></label><button class="btn btn-primary" onclick="PronostixPredictions.savePrediction('${match.id}')" ${locked ? "disabled" : ""}>Guardar</button></div></article>`;
  }

  async function savePrediction(matchId) {
    const payload = { user_id: P.state.session.user.id, match_id: matchId, home_score: P.num(P.val(`home-${matchId}`)), away_score: P.num(P.val(`away-${matchId}`)) };
    if (payload.home_score == null || payload.away_score == null) return P.toast("Captura ambos marcadores.", false);
    const { error } = await P.sb.from("predictions").upsert(payload, { onConflict: "user_id,match_id" });
    P.toast(error ? error.message : "Pronóstico guardado.", !error);
  }

  window.PronostixPredictions = { renderPredictions, savePrediction, isLocked };
}());
EOF

cat > js/specials.js <<'EOF'
(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  async function renderSpecials() {
    const { teams, players, matches } = await Data.getTournamentData();
    const tid = P.state.activeTournament?.id;
    const { data: sp, error } = await P.sb.from("special_predictions").select("*").eq("user_id", P.state.session.user.id).eq("tournament_id", tid).maybeSingle();
    if (error) P.toast(error.message, false);
    const firstKickoff = matches[0]?.kickoff_at || P.state.activeTournament?.starts_at;
    const locked = firstKickoff ? Date.now() >= new Date(firstKickoff).getTime() : false;
    UI.shell(`<section class="card p-5"><div class="section-title"><div><h2>Especiales</h2><p>Se bloquean al iniciar el torneo (${P.dt(firstKickoff)}). ${locked ? "Siguen visibles, no editables." : "Todavía puedes editar."}</p></div><span class="pill ${locked ? "danger" : "ok"}">${locked ? "Bloqueado" : "Abierto"}</span></div><div class="grid md:grid-cols-2 gap-4 mt-4"><label>Campeón<select id="champion" class="input" ${locked ? "disabled" : ""}>${UI.optionList(teams, sp?.champion_team_id)}</select></label><label>Subcampeón<select id="runner" class="input" ${locked ? "disabled" : ""}>${UI.optionList(teams, sp?.runner_up_team_id)}</select></label><label>Tercer lugar<select id="third" class="input" ${locked ? "disabled" : ""}>${UI.optionList(teams, sp?.third_place_team_id)}</select></label><label>Máximo goleador<select id="scorer" class="input" ${locked ? "disabled" : ""}>${UI.optionList(players, sp?.top_scorer_player_id)}</select></label></div><button class="btn btn-primary mt-4" onclick="PronostixSpecials.saveSpecials()" ${locked ? "disabled" : ""}>Guardar especiales</button></section>`);
  }

  async function saveSpecials() {
    const podium = [P.val("champion"), P.val("runner"), P.val("third")].filter(Boolean);
    if (new Set(podium).size !== podium.length) return P.toast("No puedes repetir equipo entre campeón, subcampeón y tercer lugar.", false);
    const payload = { user_id: P.state.session.user.id, tournament_id: P.state.activeTournament.id, champion_team_id: P.val("champion") || null, runner_up_team_id: P.val("runner") || null, third_place_team_id: P.val("third") || null, top_scorer_player_id: P.val("scorer") || null };
    const { error } = await P.sb.from("special_predictions").upsert(payload, { onConflict: "user_id,tournament_id" });
    P.toast(error ? error.message : "Especiales guardados.", !error);
  }

  window.PronostixSpecials = { renderSpecials, saveSpecials };
}());
EOF

