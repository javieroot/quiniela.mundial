#!/usr/bin/env python3
"""
Aplica el blindaje del registro de Pronostix.

Uso:
  python3 apply_auth_signup_hardening.py

Qué modifica/crea:
- js/auth.js
- css/styles.css
- index.html
- sql/migrations/20260611_auth_signup_hardening.sql
- tests/auth-register-validation.test.js
"""
from pathlib import Path

AUTH_JS = r'''
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
'''.lstrip()

SQL_MIGRATION = r'''
-- Endurece el registro público sin exponer datos personales completos.
-- 1) Permite consultar de forma segura si un username ya existe antes de auth.signUp().
-- 2) Alinea la restricción de usernames nuevos con la validación frontend: minúsculas, números, _ y -.

create or replace function public.username_exists(check_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where username = lower(trim(coalesce(check_username, '')))
  );
$$;

revoke all on function public.username_exists(text) from public;
grant execute on function public.username_exists(text) to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_username_check'
  ) then
    alter table public.profiles drop constraint profiles_username_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_username_check
  check (username ~ '^[a-z0-9_-]{3,20}$') not valid;
'''.lstrip()

TEST_JS = r'''
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const authCode = fs.readFileSync(path.join(__dirname, "..", "js", "auth.js"), "utf8");

function createElement(value = "") {
  const element = {
    value,
    className: "hidden",
    disabled: false,
    attrs: {},
    setAttribute(name, val) {
      this.attrs[name] = val;
    }
  };
  Object.defineProperty(element, "textContent", {
    get() {
      return this._text || "";
    },
    set(value) {
      this._text = String(value);
      this._html = "";
    }
  });
  Object.defineProperty(element, "innerHTML", {
    get() {
      return this._html || "";
    },
    set(value) {
      this._html = String(value);
      this._text = String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  });
  return element;
}

async function runRegister(values, options = {}) {
  const calls = { rpc: 0, signUp: 0, signUpPayload: null, toast: [] };
  const elements = {
    email: createElement(values.email || ""),
    username: createElement(values.username || ""),
    display: createElement(values.displayName || ""),
    password: createElement(values.password || ""),
    authFeedback: createElement(),
    registerButton: createElement()
  };
  elements.registerButton.textContent = "Crear cuenta";

  global.window = {
    PronostixUI: {},
    Pronostix: {
      app: { innerHTML: "" },
      val: id => elements[id]?.value?.trim(),
      siteUrl: () => "https://example.com/",
      toast: (message, ok) => calls.toast.push({ message, ok }),
      sb: {
        rpc: async () => {
          calls.rpc += 1;
          return { data: Boolean(options.duplicate), error: null };
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null })
              })
            })
          })
        }),
        auth: {
          signUp: async payload => {
            calls.signUp += 1;
            calls.signUpPayload = payload;
            return options.signUpResult || { data: { session: null }, error: null };
          }
        }
      }
    }
  };
  global.document = { getElementById: id => elements[id] || null };

  eval(authCode);
  await window.PronostixAuth.register();

  return { calls, elements, feedback: elements.authFeedback.textContent };
}

const validInput = {
  email: "usuario@example.com",
  username: "usuario2026",
  displayName: "Usuario Demo",
  password: "Password2026"
};

const cases = [
  {
    name: "Caso 1: username vacío",
    input: { ...validInput, username: " " },
    expected: "El usuario solo puede contener letras minúsculas, números, guion (-) y guion bajo (_).",
    signUp: 0
  },
  {
    name: "Caso 2: username con espacios extremos",
    input: { ...validInput, username: " usuario2026 " },
    expectedIncludes: "¡Bienvenido a Pronostix!",
    signUp: 1
  },
  {
    name: "Caso 3: correo en username",
    input: { ...validInput, username: "usuario@example.com" },
    expected: "El usuario no puede ser un correo electrónico.",
    signUp: 0
  },
  {
    name: "Caso 4: espacios internos",
    input: { ...validInput, username: "usuario demo" },
    expected: "El usuario solo puede contener letras minúsculas, números, guion (-) y guion bajo (_).",
    signUp: 0
  },
  {
    name: "Caso 5: caracteres especiales",
    input: { ...validInput, username: "usuario#" },
    expected: "El usuario solo puede contener letras minúsculas, números, guion (-) y guion bajo (_).",
    signUp: 0
  },
  {
    name: "Caso 6: username duplicado",
    input: validInput,
    options: { duplicate: true },
    expected: "Ese usuario ya está registrado.",
    signUp: 0
  },
  {
    name: "Caso 7: displayName vacío",
    input: { ...validInput, displayName: " " },
    expected: "Captura un nombre visible válido.",
    signUp: 0
  },
  {
    name: "Caso 8: contraseña corta",
    input: { ...validInput, password: "Pass1" },
    expected: "La contraseña debe contener al menos 8 caracteres.",
    signUp: 0
  },
  {
    name: "Caso 9: registro válido",
    input: { email: " usuario@example.com ", username: "Usuario2026", displayName: " Usuario Demo ", password: "Password2026" },
    expectedIncludes: "¡Bienvenido a Pronostix!",
    signUp: 1,
    assertPayload: payload => {
      assert.equal(payload.email, "usuario@example.com");
      assert.equal(payload.options.data.username, "usuario2026");
      assert.equal(payload.options.data.display_name, "Usuario Demo");
    }
  }
];

(async () => {
  for (const testCase of cases) {
    const result = await runRegister(testCase.input, testCase.options || {});
    assert.equal(result.calls.signUp, testCase.signUp, testCase.name);
    if (testCase.expected) assert.equal(result.feedback, testCase.expected, testCase.name);
    if (testCase.expectedIncludes) assert.match(result.feedback, new RegExp(testCase.expectedIncludes), testCase.name);
    if (testCase.assertPayload) testCase.assertPayload(result.calls.signUpPayload);
    console.log(`${testCase.name}: OK - ${result.feedback}`);
  }

  const dbError = await runRegister(validInput, {
    signUpResult: { data: null, error: { message: "Database error saving new user" } }
  });
  assert.equal(dbError.calls.signUp, 1);
  assert.equal(
    dbError.feedback,
    "No fue posible crear la cuenta. Revisa que el usuario no exista y que los datos capturados sean válidos."
  );
  console.log(`Error técnico Supabase: OK - ${dbError.feedback}`);
})();
'''.lstrip()

CSS_BLOCK = r'''
.field-help{margin-top:-.35rem;color:#64748b;font-size:.82rem;line-height:1.35;font-weight:750;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:.55rem .7rem}.auth-success-message{display:grid;gap:.55rem;text-align:left;font-weight:800;line-height:1.45}.auth-success-message h2{font-size:1.15rem;font-weight:950;margin:0;color:#14532d}.auth-success-message p{margin:0}.auth-success-note{background:rgba(255,255,255,.62);border:1px solid #bbf7d0;border-radius:12px;padding:.65rem .75rem}.auth-success-note ul{margin:.3rem 0 0 1.15rem;padding:0}.auth-success-note li+li{margin-top:.15rem}.btn[disabled]{opacity:.68;cursor:not-allowed}
'''.lstrip() + "\n"

ROOT = Path(__file__).resolve().parent


def write_text(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    print(f"OK: {path}")


def patch_css() -> None:
    path = ROOT / "css/styles.css"
    css = path.read_text(encoding="utf-8") if path.exists() else ""
    if ".field-help{" not in css:
        css = css.rstrip() + "\n" + CSS_BLOCK
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(css, encoding="utf-8")
        print("OK: css/styles.css")
    else:
        print("SIN CAMBIOS: css/styles.css ya tiene estilos de registro")


def patch_index() -> None:
    path = ROOT / "index.html"
    if not path.exists():
        print("AVISO: index.html no existe; actualiza manualmente los query params de css/styles.css y js/auth.js si aplica")
        return

    html = path.read_text(encoding="utf-8")
    html = html.replace("css/styles.css?v=20260611-final-qa", "css/styles.css?v=20260611-auth-hardening")
    html = html.replace("js/auth.js?v=20260611-final-qa", "js/auth.js?v=20260611-auth-hardening")
    path.write_text(html, encoding="utf-8")
    print("OK: index.html")


def main() -> None:
    write_text("js/auth.js", AUTH_JS)
    patch_css()
    patch_index()
    write_text("sql/migrations/20260611_auth_signup_hardening.sql", SQL_MIGRATION)
    write_text("tests/auth-register-validation.test.js", TEST_JS)
    print("\nListo. Recomendado ejecutar:")
    print("  node tests/auth-register-validation.test.js")
    print("  for file in js/*.js tests/*.js; do node --check \"$file\"; done")


if __name__ == "__main__":
    main()
