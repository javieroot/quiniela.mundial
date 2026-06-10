(function () {
  const P = window.Pronostix;
  const UI = window.PronostixUI;
  const Data = window.PronostixData;

  async function renderDashboard() {
    const paid = P.state.profile?.payment_status === "PAID";
    const { matches } = await Data.getTournamentData();
    const now = Date.now();
    const nextMatch = matches.find(match => new Date(match.kickoff_at).getTime() >= now) || matches[0] || null;
    const [{ data: predictions }, { data: specialPrediction }] = await Promise.all([
      P.sb.from("predictions").select("id").eq("user_id", P.state.session.user.id),
      P.sb.from("special_predictions").select("champion_team_id,runner_up_team_id,third_place_team_id,top_scorer_player_id").eq("user_id", P.state.session.user.id).eq("tournament_id", P.state.activeTournament?.id).maybeSingle()
    ]);
    const predictionCount = predictions?.length || 0;
    const totalMatches = matches.length;
    const specialsDone = Boolean(specialPrediction?.champion_team_id && specialPrediction?.runner_up_team_id && specialPrediction?.third_place_team_id && specialPrediction?.top_scorer_player_id);
    const nextLabel = nextMatch ? `${P.esc(nextMatch.home_team?.name || "Local")} vs ${P.esc(nextMatch.away_team?.name || "Visita")}` : "Sin partidos";
    const nextVenue = nextMatch ? [nextMatch.group_name, nextMatch.stadium, nextMatch.city].filter(Boolean).map(P.esc).join(" · ") : "Carga calendario en Admin";

    UI.shell(`<section class="hero card">
      <div>
        <p class="eyebrow">Torneo activo</p>
        <h2>${P.esc(P.state.activeTournament?.name || "Sin torneo activo")}</h2>
        <p>Los pronósticos se bloquean ${P.lockMinutes()} minuto(s) antes de cada partido.</p>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="PronostixApp.go('predictions')">Pronosticar partidos</button>
        <button class="btn btn-secondary" onclick="PronostixApp.go('specials')">Especiales</button>
      </div>
    </section>
    <section class="grid md:grid-cols-3 gap-4">
      <div class="card stat"><span>Torneo activo</span><b>${P.esc(P.state.activeTournament?.name || "Pendiente")}</b><small>Nombre configurado por admin.</small></div>
      <div class="card stat"><span>Mi estado de pago</span><b>${paid ? "PAGADO" : "NO PAGADO"}</b><small>${paid ? "Participas por premios oficiales." : "Apareces en general; confirma pago para premios."}</small></div>
      <div class="card stat"><span>Costo de inscripción</span><b>${P.money(P.state.settings?.entry_fee)}</b><small>Importe vigente del torneo.</small></div>
      <div class="card stat"><span>Próximo partido</span><b>${nextLabel}</b><small>${nextMatch ? `${P.dt(nextMatch.kickoff_at)} · ${nextVenue || "Sede por confirmar"}` : "Sin calendario disponible."}</small></div>
      <div class="card stat"><span>Mis pronósticos</span><b>${predictionCount}/${totalMatches}</b><small>Partidos capturados del calendario actual.</small></div>
      <div class="card stat"><span>Especiales</span><b>${specialsDone ? "Capturados" : "Pendientes"}</b><small>Campeón, subcampeón, tercer lugar y goleador.</small></div>
    </section>
    <section class="card p-5"><h3 class="text-xl font-black">Checklist para competir</h3>
      <ol class="list-decimal ml-5 mt-2 text-slate-700 space-y-1">
        <li>Guarda marcador local/visitante antes del bloqueo.</li>
        <li>Llena campeón, subcampeón, tercer lugar y goleador.</li>
        <li>Revisa ranking general para compararte y ranking oficial para premios reales.</li>
        <li>Confirma con el admin que tu estado sea PAGADO.</li>
      </ol>
    </section>`);
  }

  window.PronostixDashboard = { renderDashboard };
}());
