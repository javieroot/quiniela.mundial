(function () {
  const WORLD_CUP_26_GAMES_URL = "https://worldcup26.ir/get/games";
  const WORLD_CUP_26_GROUPS_URL = "https://worldcup26.ir/get/groups";
  const WORLD_CUP_26_CORS_PROXY_URL = "https://api.allorigins.win/raw?url=";
  const SUPABASE_2026_TEAM_PREFIX = "20260000-0000-0000-0000-0000000002";

  const TEAM_ID_MAP = Object.freeze(Object.fromEntries(
    Array.from({ length: 48 }, (_, index) => {
      const externalId = String(index + 1);
      return [externalId, `${SUPABASE_2026_TEAM_PREFIX}${String(index + 1).padStart(2, "0")}`];
    })
  ));

  const TEAM_ALIASES = Object.freeze({
    "alemania": ["germany"],
    "arabia saudita": ["saudi arabia"],
    "argelia": ["algeria"],
    "argentina": ["argentina"],
    "australia": ["australia"],
    "austria": ["austria"],
    "belgica": ["belgium"],
    "bosnia y herzegovina": ["bosnia and herzegovina", "bosnia-herzegovina"],
    "brasil": ["brazil"],
    "cabo verde": ["cape verde"],
    "canada": ["canada"],
    "catar": ["qatar"],
    "chequia": ["czech republic", "czechia"],
    "colombia": ["colombia"],
    "corea del sur": ["south korea", "korea republic", "republic of korea"],
    "costa de marfil": ["ivory coast", "cote divoire", "côte d’ivoire", "côte d'ivoire"],
    "croacia": ["croatia"],
    "curazao": ["curacao", "curaçao"],
    "ecuador": ["ecuador"],
    "egipto": ["egypt"],
    "escocia": ["scotland"],
    "espana": ["spain"],
    "estados unidos": ["united states", "usa", "united states of america"],
    "francia": ["france"],
    "ghana": ["ghana"],
    "haiti": ["haiti"],
    "inglaterra": ["england"],
    "irak": ["iraq"],
    "iran": ["iran"],
    "japon": ["japan"],
    "jordania": ["jordan"],
    "marruecos": ["morocco"],
    "mexico": ["mexico"],
    "noruega": ["norway"],
    "nueva zelanda": ["new zealand"],
    "paises bajos": ["netherlands", "holland"],
    "panama": ["panama"],
    "paraguay": ["paraguay"],
    "portugal": ["portugal"],
    "rd congo": ["dr congo", "congo dr", "democratic republic of congo", "d r congo"],
    "senegal": ["senegal"],
    "sudafrica": ["south africa"],
    "suecia": ["sweden"],
    "suiza": ["switzerland"],
    "tunez": ["tunisia"],
    "turquia": ["turkey", "turkiye", "türkiye"],
    "uruguay": ["uruguay"],
    "uzbekistan": ["uzbekistan"]
  });

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function supabaseTeamId(externalTeamId) {
    return TEAM_ID_MAP[String(externalTeamId || "").trim()] || null;
  }

  function teamCandidates(team) {
    const base = [team?.id, team?.name, team?.code].map(normalizeText).filter(Boolean);
    const aliases = TEAM_ALIASES[normalizeText(team?.name)] || [];
    return [...base, ...aliases.map(normalizeText)].filter(Boolean);
  }

  function teamNameMatches(externalName, team) {
    const external = normalizeText(externalName);
    return Boolean(external) && teamCandidates(team).some(candidate => external === candidate || external.includes(candidate) || candidate.includes(external));
  }

  function teamIdMatches(externalTeamId, team) {
    const mappedId = supabaseTeamId(externalTeamId);
    return Boolean(mappedId && team?.id === mappedId);
  }

  function groupLabel(value) {
    const group = String(value || "").trim();
    return group ? `Grupo ${group.toUpperCase()}` : "Grupo por confirmar";
  }

  function proxiedUrl(url) {
    return `${WORLD_CUP_26_CORS_PROXY_URL}${encodeURIComponent(url)}`;
  }

  window.PronostixWorldCup26 = { WORLD_CUP_26_GAMES_URL, WORLD_CUP_26_GROUPS_URL, WORLD_CUP_26_CORS_PROXY_URL, TEAM_ID_MAP, TEAM_ALIASES, normalizeText, supabaseTeamId, teamNameMatches, teamIdMatches, groupLabel, proxiedUrl };
}());
