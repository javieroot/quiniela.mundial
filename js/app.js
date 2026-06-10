(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  async function init() {
    if (!P.requireConfig()) return UI.configMissing();

    const { data } = await P.sb.auth.getSession();
    P.state.session = data.session;

    P.sb.auth.onAuthStateChange(async (event, session) => {
      P.state.session = session;
      if (event === "PASSWORD_RECOVERY") P.state.needsPasswordUpdate = true;
      await bootstrap();
    });

    if (location.hash.includes("type=recovery") || location.search.includes("type=recovery")) {
      P.state.needsPasswordUpdate = true;
    }

    await bootstrap();
  }

  async function bootstrap() {
    if (!P.state.session) return window.PronostixAuth.renderAuth();

    await Data.loadProfile();
    await Data.loadBase();
    render();
  }

  function render() {
    if (!P.state.session) return window.PronostixAuth.renderAuth();
    if (P.state.needsPasswordUpdate) return window.PronostixAuth.renderUpdatePassword();
    if (!P.state.profile) return UI.loading("Cargando perfil...");
    if (!P.state.activeTournament) {
      return UI.shell(UI.emptyState("Sin torneo", "Crea o activa un torneo desde Supabase o Administración."));
    }

    const views = {
      dashboard: window.PronostixDashboard.renderDashboard,
      predictions: window.PronostixPredictions.renderPredictions,
      specials: window.PronostixSpecials.renderSpecials,
      general: () => window.PronostixRankings.renderRanking(false),
      official: () => window.PronostixRankings.renderRanking(true),
      rules: window.PronostixRules.renderRules,
      admin: window.PronostixAdmin.renderAdmin
    };

    return (views[P.state.view] || views.dashboard)();
  }

  async function go(view) {
    P.state.view = view;
    await Data.loadBase();
    render();
  }

  window.PronostixApp = { init, bootstrap, render, go };
  init();
}());
