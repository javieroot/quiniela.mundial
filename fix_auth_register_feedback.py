from pathlib import Path

AUTH_PATH = Path("js/auth.js")
CSS_PATH = Path("css/styles.css")

auth = AUTH_PATH.read_text(encoding="utf-8")
css = CSS_PATH.read_text(encoding="utf-8")

# 1. Agregar contenedor visible de feedback en pantalla de auth.
old = '''      <div class="stack">
        ${isRegister ? registerForm() : isReset ? resetForm() : loginForm()}
      </div>'''
new = '''      <div class="stack">
        ${isRegister ? registerForm() : isReset ? resetForm() : loginForm()}
        <div id="authFeedback" class="auth-feedback hidden" aria-live="polite"></div>
      </div>'''

if old in auth and 'id="authFeedback"' not in auth:
    auth = auth.replace(old, new)

# 2. Agregar id al botón Crear cuenta para poder mostrar estado "Creando cuenta...".
old = '''    <button class="btn btn-primary w-full" onclick="PronostixAuth.register()">Crear cuenta</button>'''
new = '''    <button id="registerButton" class="btn btn-primary w-full" onclick="PronostixAuth.register()">Crear cuenta</button>'''

if old in auth and 'id="registerButton"' not in auth:
    auth = auth.replace(old, new)

# 3. Agregar feedback también en pantalla de nueva contraseña si no existe ahí.
old = '''        <button class="btn btn-primary w-full" onclick="PronostixAuth.updatePassword()">Actualizar contraseña</button>
        <button class="btn btn-secondary w-full" onclick="PronostixAuth.logout()">Cancelar</button>
      </div>'''
new = '''        <button class="btn btn-primary w-full" onclick="PronostixAuth.updatePassword()">Actualizar contraseña</button>
        <button class="btn btn-secondary w-full" onclick="PronostixAuth.logout()">Cancelar</button>
        <div id="authFeedback" class="auth-feedback hidden" aria-live="polite"></div>
      </div>'''

if old in auth and auth.count('id="authFeedback"') < 2:
    auth = auth.replace(old, new)

# 4. Insertar helpers setAuthFeedback y setRegisterLoading.
marker = '''  async function register() {'''
helpers = '''  function setAuthFeedback(message, ok = true) {
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

  async function register() {'''

if marker in auth and "function setAuthFeedback" not in auth:
    auth = auth.replace(marker, helpers)

# 5. Reemplazar register() para mostrar mensaje visible al usuario.
old = '''  async function register() {
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
  }'''

new = '''  async function register() {
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
  }'''

if old in auth:
    auth = auth.replace(old, new)

# 6. Si el register ya estaba parcialmente modificado, asegurar mensaje final correcto.
auth = auth.replace(
    'const message = error ? error.message : "Cuenta creada. Si Supabase requiere confirmación, revisa tu email. Si no, ya puedes iniciar sesión.";',
    'const message = error ? (error.message || "No se pudo crear la cuenta. Intenta de nuevo.") : "Cuenta creada. Si Supabase requiere confirmación, revisa tu email. Si no, ya puedes iniciar sesión.";'
)

# 7. Agregar estilos del feedback.
feedback_css = '.auth-feedback{border-radius:14px;padding:.8rem .9rem;font-weight:900;text-align:center}.auth-feedback-ok{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}.auth-feedback-error{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}'

if ".auth-feedback{" not in css:
    css = css.rstrip() + "\n" + feedback_css + "\n"

AUTH_PATH.write_text(auth, encoding="utf-8")
CSS_PATH.write_text(css, encoding="utf-8")

print("OK: corregido feedback de creación de cuenta.")
print("Archivos modificados:")
print("- js/auth.js")
print("- css/styles.css")
