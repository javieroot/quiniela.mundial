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
