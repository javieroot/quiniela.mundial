(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let registerInProgress = false;

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
    <input id="username" class="input" placeholder="Usuario único" autocomplete="username" autocapitalize="none" spellcheck="false">
    <p class="field-help">Solo letras minúsculas, números, guion (-) y guion bajo (_). No usar espacios ni correos electrónicos.</p>
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

  function setAuthFeedback(message, ok = true, asHtml = false) {
    const el = document.getElementById("authFeedback");
    if (!el) return;
    if (asHtml) el.innerHTML = message;
    else el.textContent = message;
    el.className = `auth-feedback ${ok ? "auth-feedback-ok" : "auth-feedback-error"}`;
  }

  function setRegisterLoading(loading) {
    const button = document.getElementById("registerButton");
    if (!button) return;
    button.disabled = loading;
    button.setAttribute("aria-busy", loading ? "true" : "false");
    button.textContent = loading ? "Creando cuenta..." : "Crear cuenta";
  }

  function normalizeRegistrationInput() {
    return {
      email: String(P.val("email") || "").toLowerCase(),
      password: document.getElementById("password")?.value || "",
      username: String(P.val("username") || "").toLowerCase(),
      displayName: String(P.val("display") || "")
    };
  }

  function syncNormalizedFields({ email, username, displayName }) {
    const emailInput = document.getElementById("email");
    const usernameInput = document.getElementById("username");
    const displayInput = document.getElementById("display");
    if (emailInput) emailInput.value = email;
    if (usernameInput) usernameInput.value = username;
    if (displayInput) displayInput.value = displayName;
  }

  function validateRegistrationInput({ email, password, username, displayName }) {
    if (!username) return "El usuario solo puede contener letras minúsculas, números, guion (-) y guion bajo (_).";
    if (username.includes("@")) return "El usuario no puede ser un correo electrónico.";
    if (!USERNAME_REGEX.test(username)) return "El usuario solo puede contener letras minúsculas, números, guion (-) y guion bajo (_).";
    if (!displayName || displayName.length < 2 || displayName.length > 50) return "Captura un nombre visible válido.";
    if (!email || !EMAIL_REGEX.test(email)) return "Captura un correo electrónico válido.";
    if (!password || password.length < 8) return "La contraseña debe contener al menos 8 caracteres.";
    return "";
  }

  function friendlySignUpError(error) {
    const text = String(error?.message || "");
    if (/database error|duplicate key|profiles_username|violates unique|check constraint/i.test(text)) {
      return "No fue posible crear la cuenta. Revisa que el usuario no exista y que los datos capturados sean válidos.";
    }
    if (/already registered|already exists|user already/i.test(text)) return "Ese correo electrónico ya está registrado.";
    if (/password/i.test(text)) return "La contraseña debe contener al menos 8 caracteres.";
    return "No fue posible crear la cuenta. Revisa que el usuario no exista y que los datos capturados sean válidos.";
  }

  function successMessageHtml(needsEmailConfirmation) {
    if (needsEmailConfirmation) {
      return `<div class="auth-success-message">
        <h2>🎉 ¡Bienvenido a Pronostix!</h2>
        <p>Tu cuenta fue creada correctamente.</p>
        <p>📧 Revisa tu correo electrónico y confirma tu registro.</p>
        <div class="auth-success-note"><p>Si no encuentras el mensaje:</p><ul><li>revisa Spam</li><li>revisa Correo no deseado</li></ul></div>
        <p>⚽ Después de confirmar tu cuenta podrás iniciar sesión y capturar tus pronósticos.</p>
      </div>`;
    }
    return `<div class="auth-success-message">
      <h2>🎉 ¡Bienvenido a Pronostix!</h2>
      <p>Tu cuenta fue creada correctamente.</p>
      <p>⚽ Ya puedes iniciar sesión con tu correo y contraseña.</p>
    </div>`;
  }

  async function usernameExists(username) {
    const rpcResult = await P.sb.rpc("username_exists", { check_username: username }).catch(error => ({ error }));
    if (!rpcResult.error && typeof rpcResult.data === "boolean") return rpcResult.data;

    const { data, error } = await P.sb.from("profiles").select("id").eq("username", username).limit(1).maybeSingle().catch(error => ({ error }));
    if (error) return false;
    return Boolean(data);
  }

  async function register() {
    if (registerInProgress) return;
    const input = normalizeRegistrationInput();
    syncNormalizedFields(input);
    const validationMessage = validateRegistrationInput(input);
    if (validationMessage) {
      setAuthFeedback(validationMessage, false);
      P.toast(validationMessage, false);
      return;
    }

    registerInProgress = true;
    setRegisterLoading(true);
    setAuthFeedback("Creando cuenta...", true);

    const duplicate = await usernameExists(input.username);
    if (duplicate) {
      registerInProgress = false;
      setRegisterLoading(false);
      setAuthFeedback("Ese usuario ya está registrado.", false);
      P.toast("Ese usuario ya está registrado.", false);
      return;
    }

    const { data, error } = await P.sb.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { username: input.username, display_name: input.displayName },
        emailRedirectTo: P.siteUrl()
      }
    }).catch(error => ({ error }));

    registerInProgress = false;
    setRegisterLoading(false);

    if (error) {
      const message = friendlySignUpError(error);
      setAuthFeedback(message, false);
      P.toast(message, false);
      return;
    }

    const needsEmailConfirmation = !data?.session;
    setAuthFeedback(successMessageHtml(needsEmailConfirmation), true, true);
    P.toast("Cuenta creada correctamente. Revisa las indicaciones en pantalla.", true);
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
