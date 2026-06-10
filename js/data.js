(function () {
  const P = window.Pronostix;

  async function loadProfile() {
    P.state.profile = null;
    if (!P.state.session?.user) return null;
    const { data, error } = await P.sb.from("profiles").select("*").eq("id", P.state.session.user.id).maybeSingle();
    if (error) P.toast(error.message, false);
    P.state.profile = data || null;
    return P.state.profile;
  }

  async function loadBase() {
    if (!P.state.session) return;
    const [{ data: tournaments, error: tournamentError }, { data: settings, error: settingsError }] = await Promise.all([
      P.sb.from("tournaments").select("*").order("starts_at"),
      P.sb.from("settings").select("*").eq("id", 1).maybeSingle()
    ]);
    if (tournamentError) P.toast(tournamentError.message, false);
    if (settingsError) P.toast(settingsError.message, false);
    P.state.tournaments = tournaments || [];
    P.state.activeTournament = P.state.tournaments.find(t => t.is_active) || P.state.tournaments[0] || null;
    P.state.settings = settings || null;
  }

  async function getTournamentData() {
    const tid = P.state.activeTournament?.id;
    if (!tid) return { teams: [], players: [], matches: [] };
    const [teams, players, matches] = await Promise.all([
      P.sb.from("teams").select("*").eq("tournament_id", tid).order("name"),
      P.sb.from("players").select("*").eq("tournament_id", tid).order("name"),
      P.sb.from("matches").select("*, home_team:teams!matches_home_team_id_fkey(id,name,short_name), away_team:teams!matches_away_team_id_fkey(id,name,short_name)").eq("tournament_id", tid).order("kickoff_at")
    ]);
    if (teams.error) P.toast(teams.error.message, false);
    if (players.error) P.toast(players.error.message, false);
    if (matches.error) P.toast(matches.error.message, false);
    return { teams: teams.data || [], players: players.data || [], matches: matches.data || [] };
  }

  async function loadAllForRanking() {
    const tid = P.state.activeTournament?.id;
    const [profiles, matches, predictions, specialPredictions, specialResults] = await Promise.all([
      P.sb.from("profiles").select("id,username,display_name,payment_status,created_at,updated_at"),
      P.sb.from("matches").select("*").eq("tournament_id", tid),
      P.sb.from("predictions").select("*"),
      P.sb.from("special_predictions").select("*").eq("tournament_id", tid),
      P.sb.from("special_results").select("*").eq("tournament_id", tid).maybeSingle()
    ]);
    [profiles, matches, predictions, specialPredictions, specialResults].forEach(result => { if (result.error) P.toast(result.error.message, false); });
    return {
      profiles: profiles.data || [],
      matches: matches.data || [],
      predictions: predictions.data || [],
      specialPredictions: specialPredictions.data || [],
      specialResults: specialResults.data || null
    };
  }

  window.PronostixData = { loadProfile, loadBase, getTournamentData, loadAllForRanking };
}());
