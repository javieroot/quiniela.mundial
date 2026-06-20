(function () {
  const WORLD_CUP_26_GAMES_URL = "https://worldcup26.ir/get/games";
  const WORLD_CUP_26_GROUPS_URL = "https://worldcup26.ir/get/groups";
  const WORLD_CUP_26_CORS_PROXY_URL = "https://api.allorigins.win/raw?url=";
  const SUPABASE_2026_TEAM_PREFIX = "20260000-0000-0000-0000-0000000002";
  const TRUST_TEAM_ID_MAP = true;

  const TEAM_ID_MAP = Object.freeze(Object.fromEntries(
    Array.from({ length: 48 }, (_, index) => {
      const externalId = String(index + 1);
      return [externalId, `${SUPABASE_2026_TEAM_PREFIX}${String(index + 1).padStart(2, "0")}`];
    })
  ));


  const TEAM_NAMES_BY_ID = Object.freeze({
    "1": "México",
    "2": "Sudáfrica",
    "3": "Corea del Sur",
    "4": "Chequia",
    "5": "Canadá",
    "6": "Bosnia y Herzegovina",
    "7": "Catar",
    "8": "Suiza",
    "9": "Brasil",
    "10": "Marruecos",
    "11": "Haití",
    "12": "Escocia",
    "13": "Estados Unidos",
    "14": "Paraguay",
    "15": "Australia",
    "16": "Turquía",
    "17": "Alemania",
    "18": "Curazao",
    "19": "Costa de Marfil",
    "20": "Ecuador",
    "21": "Países Bajos",
    "22": "Japón",
    "23": "Suecia",
    "24": "Túnez",
    "25": "Bélgica",
    "26": "Egipto",
    "27": "Irán",
    "28": "Nueva Zelanda",
    "29": "España",
    "30": "Cabo Verde",
    "31": "Arabia Saudita",
    "32": "Uruguay",
    "33": "Francia",
    "34": "Senegal",
    "35": "Irak",
    "36": "Noruega",
    "37": "Argentina",
    "38": "Argelia",
    "39": "Austria",
    "40": "Jordania",
    "41": "Portugal",
    "42": "RD Congo",
    "43": "Uzbekistán",
    "44": "Colombia",
    "45": "Inglaterra",
    "46": "Croacia",
    "47": "Ghana",
    "48": "Panamá"
  });

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

  function teamNameById(externalTeamId) {
    return TEAM_NAMES_BY_ID[String(externalTeamId || "").trim()] || null;
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
    if (!TRUST_TEAM_ID_MAP) return false;
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

  window.PronostixWorldCup26 = { WORLD_CUP_26_GAMES_URL, WORLD_CUP_26_GROUPS_URL, WORLD_CUP_26_CORS_PROXY_URL, TEAM_ID_MAP, TEAM_NAMES_BY_ID, TRUST_TEAM_ID_MAP, TEAM_ALIASES, normalizeText, supabaseTeamId, teamNameById, teamNameMatches, teamIdMatches, groupLabel, proxiedUrl };
}());
