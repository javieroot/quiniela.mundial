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
