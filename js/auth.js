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
      </div>
    </section></main>`;
  }

  const loginForm = () => `<input id="email" class="input" placeholder="Correo electrónico" type="email" autocomplete="email">
    <input id="password" class="input" placeholder="Contraseña" type="password" autocomplete="current-password">
    <button class="btn btn-primary w-full" onclick="PronostixAuth.login()">Entrar</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('register')">Registrarme</button>
    <button class="link-btn" onclick="PronostixAuth.renderAuth('reset')">Olvidé mi contraseña</button>`;

  const registerForm = () => `<input id="email" class="input" placeholder="Correo electrónico" type="email" autocomplete="email">
    <input id="username" class="input" placeholder="Usuario único" autocomplete="username">
    <input id="display" class="input" placeholder="Nombre visible">
    <input id="password" class="input" placeholder="Contraseña" type="password" autocomplete="new-password">
    <button class="btn btn-primary w-full" onclick="PronostixAuth.register()">Crear cuenta</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('login')">Ya tengo cuenta</button>`;

  const resetForm = () => `<input id="email" class="input" placeholder="Correo electrónico" type="email" autocomplete="email">
    <button class="btn btn-primary w-full" onclick="PronostixAuth.resetPassword()">Enviar recuperación</button>
    <button class="btn btn-secondary w-full" onclick="PronostixAuth.renderAuth('login')">Volver</button>`;

  function renderUpdatePassword() {
    P.app.innerHTML = `<main class="auth-page"><section class="card auth-card">
      <h1 class="auth-title">Nueva contraseña</h1>
      <p class="auth-subtitle">Captura tu nueva contraseña para terminar la recuperación.</p>
      <div class="stack">
        <input id="newPassword" class="input" placeholder="Nueva contraseña" type="password" autocomplete="new-password">
        <input id="confirmPassword" class="input" placeholder="Confirmar contraseña" type="password" autocomplete="new-password">
        <button class="btn btn-primary w-full" onclick="PronostixAuth.updatePassword()">Actualizar contraseña</button>
        <button class="btn btn-secondary w-full" onclick="PronostixAuth.logout()">Cancelar</button>
      </div>
    </section></main>`;
  }

  async function register() {
    const email = P.val("email");
    const password = P.val("password");
    const username = P.val("username");
    const displayName = P.val("display");
    if (!email || !password || !username || !displayName) return P.toast("Completa email, username, nombre visible y contraseña.", false);
    const { error } = await P.sb.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName },
        emailRedirectTo: P.siteUrl()
      }
    });
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

  window.PronostixAuth = { renderAuth, renderUpdatePassword, register, login, logout, resetPassword, updatePassword };
}());
