(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;

  function renderAuth(mode = "login") {
    const isRegister = mode === "register";
    const isReset = mode === "reset";
    P.app.innerHTML = `<main class="auth-page"><section class="card auth-card">
      <h1 class="auth-title">Pronostix</h1>
      <p class="auth-subtitle">Tu quiniela del torneo, limpia y segura.</p>
      <div class="stack">
        ${isRegister ? registerForm() : isReset ? resetForm() : loginForm()}
        <div id="authFeedback" class="auth-feedback hidden" aria-live="polite"></div>
      </div>
    </section></main>`;
  }

  const passwordField = (id, placeholder, autocomplete) => `<div class="password-field"><input id="${id}" class="input" placeholder="${placeholder}" type="password" autocomplete="${autocomplete}"><button type="button" class="password-toggle" onclick="PronostixAuth.togglePassword('${id}', this)">Mostrar</button></div>`;

  const loginForm = () => `<input id="email" class="input" placeholder="Correo electrónico" type="email" autocomplete="email">
    ${passwordField("password", "Contraseña", "current-password")}
    <button class="btn btn-primary w-full" onclick="PronostixAuth.login()">Entrar</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('register')">Registrarme</button>
    <button class="link-btn" onclick="PronostixAuth.renderAuth('reset')">Olvidé mi contraseña</button>`;

  const registerForm = () => `<input id="email" class="input" placeholder="Correo electrónico" type="email" autocomplete="email">
    <input id="username" class="input" placeholder="Usuario único" autocomplete="username">
    <input id="display" class="input" placeholder="Nombre visible">
    ${passwordField("password", "Contraseña", "new-password")}
    <button id="registerButton" class="btn btn-primary w-full" onclick="PronostixAuth.register()">Crear cuenta</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('login')">Ya tengo cuenta</button>`;

  const resetForm = () => `<input id="email" class="input" placeholder="Correo electrónico" type="email" autocomplete="email">
    <button class="btn btn-primary w-full" onclick="PronostixAuth.resetPassword()">Enviar recuperación</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('login')">Volver</button>`;

  function renderUpdatePassword() {
    P.app.innerHTML = `<main class="auth-page"><section class="card auth-card">
      <h1 class="auth-title">Nueva contraseña</h1>
      <p class="auth-subtitle">Captura tu nueva contraseña para terminar la recuperación.</p>
      <div class="stack">
        ${passwordField("newPassword", "Nueva contraseña", "new-password")}
        ${passwordField("confirmPassword", "Confirmar contraseña", "new-password")}
        <button class="btn btn-primary w-full" onclick="PronostixAuth.updatePassword()">Actualizar contraseña</button>
        <button class="btn btn-secondary w-full" onclick="PronostixAuth.logout()">Cancelar</button>
        <div id="authFeedback" class="auth-feedback hidden" aria-live="polite"></div>
      </div>
    </section></main>`;
  }

  function togglePassword(id, button) {
    const input = document.getElementById(id);
    if (!input) return;
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    if (button) button.textContent = showing ? "Mostrar" : "Ocultar";
  }

  function setAuthFeedback(message, ok = true) {
    const el = document.getElementById("authFeedback");
    if (!el) return;
    el.textContent = message;
    el.className = `auth-feedback ${ok ? "auth-feedback-ok" : "auth-feedback-error"}`;
  }

  function setRegisterLoading(loading) {
    const button = document.getElementById("registerButton");
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "Creando cuenta..." : "Crear cuenta";
  }

  async function register() {
    const email = P.val("email");
    const password = P.val("password");
    const username = P.val("username");
    const displayName = P.val("display");
    if (!email || !password || !username || !displayName) {
      setAuthFeedback("Completa email, username, nombre visible y contraseña.", false);
      return P.toast("Completa email, username, nombre visible y contraseña.", false);
    }
    setRegisterLoading(true);
    setAuthFeedback("Creando cuenta...", true);
    const { error } = await P.sb.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName },
        emailRedirectTo: P.siteUrl()
      }
    }).catch(error => ({ error }));
    setRegisterLoading(false);
    const message = error ? (error.message || "No se pudo crear la cuenta. Intenta de nuevo.") : "Cuenta creada. Si Supabase requiere confirmación, revisa tu email. Si no, ya puedes iniciar sesión.";
    setAuthFeedback(message, !error);
    P.toast(message, !error);
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
    P.toast(error ? error.message : "Correo de recuperación enviado. Revisa también spam.", !error);
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

  window.PronostixAuth = { renderAuth, renderUpdatePassword, togglePassword, register, login, logout, resetPassword, updatePassword };
}());
