(function () {
  const cfg = window.PRONOSTIX_CONFIG || {};
  const app = document.getElementById("app");
  const hasSupabase = Boolean(window.supabase?.createClient);
  const existingClient = window.Pronostix?.sb || window.__PRONOSTIX_SUPABASE_CLIENT__ || null;
  const sb = existingClient || (hasSupabase ? window.supabase.createClient(cfg.supabaseUrl || "", cfg.supabaseAnonKey || "", {
    auth: {
      storageKey: "pronostix-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }) : null);
  if (sb && !window.__PRONOSTIX_SUPABASE_CLIENT__) window.__PRONOSTIX_SUPABASE_CLIENT__ = sb;
  const state = {
    session: null,
    profile: null,
    view: "dashboard",
    tournaments: [],
    activeTournament: null,
    settings: null,
    needsPasswordUpdate: false,
    cache: {}
  };

  const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n || 0));
  const dt = (v) => v ? new Date(v).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "";
  const dateOnly = (v) => v ? new Date(v).toLocaleDateString("es-MX", { dateStyle: "medium" }) : "";
  const val = (id) => document.getElementById(id)?.value?.trim();
  const num = (v, fallback = null) => v === "" || v == null || Number.isNaN(Number(v)) ? fallback : Number(v);
  const esc = (s) => String(s ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const lockMinutes = () => Math.max(0, Number(state.settings?.lock_minutes_before_match ?? 1));
  const paymentLabel = (status) => status === "PAID" ? "PAGADO" : "NO PAGADO";
  const matchStatusLabel = (status) => status === "FINISHED" ? "Finalizado" : "Programado";

  const avatarEmojis = ["🦅", "🐺", "🦁", "🐯", "🐉", "🦊", "🐻", "🐼", "⚽", "🏆", "🌵", "🔥", "⭐", "🚀", "💎", "🎯"];
  const avatarGradients = [
    "#2563eb,#7c3aed",
    "#059669,#0ea5e9",
    "#dc2626,#f97316",
    "#7c2d12,#facc15",
    "#be185d,#7c3aed",
    "#0f766e,#22c55e",
    "#1e3a8a,#0891b2",
    "#9333ea,#ec4899"
  ];

  const hashText = (text) => Array.from(String(text || "pronostix")).reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) >>> 0, 2166136261);

  const avatarFor = (user = {}) => {
    const seed = hashText(user.id || user.username || user.display_name);
    return {
      emoji: avatarEmojis[seed % avatarEmojis.length],
      gradient: avatarGradients[seed % avatarGradients.length]
    };
  };

  const avatarHtml = (user = {}, size = "md") => {
    const avatar = avatarFor(user);
    return `<span class="avatar avatar-${size}" style="--avatar-bg:linear-gradient(135deg,${avatar.gradient})">${avatar.emoji}</span>`;
  };

  const siteUrl = () => (cfg.siteUrl || window.location.origin + window.location.pathname).replace(/#.*$/, "");

  const friendlyError = (message) => {
    const text = String(message || "Error desconocido.");
    if (text.includes("Database error querying schema")) {
      return "Supabase no encuentra el esquema esperado. Ejecuta sql/schema.sql en el proyecto correcto y revisa config.js.";
    }
    if (text.includes("JWT") || text.includes("Invalid API key")) {
      return "La anon key o la URL de Supabase no coinciden. Revisa config.js.";
    }
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

  const requireConfig = () => Boolean(
    hasSupabase
    && sb
    && cfg.supabaseUrl
    && cfg.supabaseAnonKey
    && cfg.siteUrl
    && !cfg.supabaseUrl.includes("TU-PROYECTO")
  );

  window.Pronostix = {
    cfg,
    app,
    sb,
    state,
    money,
    dt,
    dateOnly,
    val,
    num,
    esc,
    lockMinutes,
    paymentLabel,
    matchStatusLabel,
    avatarFor,
    avatarHtml,
    siteUrl,
    toast,
    friendlyError,
    requireConfig
  };
}());
