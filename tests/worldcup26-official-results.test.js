const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  window: {
    localStorage: { getItem: () => null, setItem: () => null },
    Pronostix: {
      state: { settings: { results_api_provider: 'worldcup26', results_api_base_url: '' } },
      esc: value => String(value ?? ''),
      dt: value => value,
      money: value => String(value),
      val: () => '',
      num: value => Number(value || 0),
      toast: () => {}
    },
    PronostixUI: {},
    PronostixData: {},
    PronostixRankings: {}
  },
  console
};
context.global = context;
vm.runInNewContext(fs.readFileSync('js/worldcup26-translator.js', 'utf8'), context, { filename: 'js/worldcup26-translator.js' });
vm.runInNewContext(fs.readFileSync('js/admin.js', 'utf8'), context, { filename: 'js/admin.js' });

const { resolveExternalEvent, isApiItemFinished } = context.window.PronostixAdmin._internals;
const { supabaseTeamId, teamNameById } = context.window.PronostixWorldCup26;

const officialResults = [
  // Jornada 1 completada
  { matchId: '20260000-0000-0000-0000-000000000401', home: '1', away: '2', homeScore: 2, awayScore: 0, label: 'Grupo A: México 2 - 0 Sudáfrica' },
  { matchId: '20260000-0000-0000-0000-000000000402', home: '3', away: '4', homeScore: 2, awayScore: 1, label: 'Grupo A: Corea del Sur 2 - 1 Chequia' },
  { matchId: '20260000-0000-0000-0000-000000000403', home: '5', away: '6', homeScore: 1, awayScore: 1, label: 'Grupo B: Canadá 1 - 1 Bosnia y Herzegovina' },
  { matchId: '20260000-0000-0000-0000-000000000404', home: '13', away: '14', homeScore: 4, awayScore: 1, label: 'Grupo D: Estados Unidos 4 - 1 Paraguay' },
  { matchId: '20260000-0000-0000-0000-000000000405', home: '7', away: '8', homeScore: 1, awayScore: 1, label: 'Grupo B: Catar 1 - 1 Suiza' },
  { matchId: '20260000-0000-0000-0000-000000000406', home: '9', away: '10', homeScore: 1, awayScore: 1, label: 'Grupo C: Brasil 1 - 1 Marruecos' },
  { matchId: '20260000-0000-0000-0000-000000000407', home: '11', away: '12', homeScore: 0, awayScore: 1, label: 'Grupo C: Haití 0 - 1 Escocia' },
  { matchId: '20260000-0000-0000-0000-000000000408', home: '15', away: '16', homeScore: 2, awayScore: 0, label: 'Grupo D: Australia 2 - 0 Turquía' },
  { matchId: '20260000-0000-0000-0000-000000000409', home: '19', away: '20', homeScore: 1, awayScore: 0, label: 'Grupo E: Costa de Marfil 1 - 0 Ecuador' },
  { matchId: '20260000-0000-0000-0000-000000000410', home: '17', away: '18', homeScore: 7, awayScore: 1, label: 'Grupo E: Alemania 7 - 1 Curazao' },
  { matchId: '20260000-0000-0000-0000-000000000411', home: '21', away: '22', homeScore: 2, awayScore: 2, label: 'Grupo F: Países Bajos 2 - 2 Japón' },
  { matchId: '20260000-0000-0000-0000-000000000412', home: '23', away: '24', homeScore: 5, awayScore: 1, label: 'Grupo F: Suecia 5 - 1 Túnez' },
  { matchId: '20260000-0000-0000-0000-000000000413', home: '27', away: '28', homeScore: 2, awayScore: 2, label: 'Grupo G: Irán 2 - 2 Nueva Zelanda' },
  { matchId: '20260000-0000-0000-0000-000000000414', home: '25', away: '26', homeScore: 1, awayScore: 1, label: 'Grupo G: Bélgica 1 - 1 Egipto' },
  { matchId: '20260000-0000-0000-0000-000000000415', home: '31', away: '32', homeScore: 1, awayScore: 1, label: 'Grupo H: Arabia Saudita 1 - 1 Uruguay' },
  { matchId: '20260000-0000-0000-0000-000000000416', home: '29', away: '30', homeScore: 0, awayScore: 0, label: 'Grupo H: España 0 - 0 Cabo Verde' },
  { matchId: '20260000-0000-0000-0000-000000000417', home: '33', away: '34', homeScore: 3, awayScore: 1, label: 'Grupo I: Francia 3 - 1 Senegal' },
  { matchId: '20260000-0000-0000-0000-000000000418', home: '35', away: '36', homeScore: 1, awayScore: 4, label: 'Grupo I: Irak 1 - 4 Noruega' },
  { matchId: '20260000-0000-0000-0000-000000000419', home: '37', away: '38', homeScore: 3, awayScore: 0, label: 'Grupo J: Argentina 3 - 0 Argelia' },
  { matchId: '20260000-0000-0000-0000-000000000420', home: '39', away: '40', homeScore: 3, awayScore: 1, label: 'Grupo J: Austria 3 - 1 Jordania' },
  { matchId: '20260000-0000-0000-0000-000000000421', home: '41', away: '42', homeScore: 1, awayScore: 1, label: 'Grupo K: Portugal 1 - 1 RD Congo' },
  { matchId: '20260000-0000-0000-0000-000000000422', home: '43', away: '44', homeScore: 1, awayScore: 3, label: 'Grupo K: Uzbekistán 1 - 3 Colombia' },
  { matchId: '20260000-0000-0000-0000-000000000423', home: '47', away: '48', homeScore: 1, awayScore: 0, label: 'Grupo L: Ghana 1 - 0 Panamá' },
  { matchId: '20260000-0000-0000-0000-000000000424', home: '45', away: '46', homeScore: 4, awayScore: 2, label: 'Grupo L: Inglaterra 4 - 2 Croacia' },

  // Jornada 2 completada: grupos A, B, C y D
  { matchId: '20260000-0000-0000-0000-000000000425', home: '4', away: '2', homeScore: 1, awayScore: 1, label: 'Grupo A: Chequia 1 - 1 Sudáfrica' },
  { matchId: '20260000-0000-0000-0000-000000000426', home: '1', away: '3', homeScore: 1, awayScore: 0, label: 'Grupo A: México 1 - 0 Corea del Sur' },
  { matchId: '20260000-0000-0000-0000-000000000427', home: '8', away: '6', homeScore: 4, awayScore: 1, label: 'Grupo B: Suiza 4 - 1 Bosnia y Herzegovina' },
  { matchId: '20260000-0000-0000-0000-000000000428', home: '5', away: '7', homeScore: 6, awayScore: 0, label: 'Grupo B: Canadá 6 - 0 Catar' },
  { matchId: '20260000-0000-0000-0000-000000000429', home: '12', away: '10', homeScore: 0, awayScore: 1, label: 'Grupo C: Escocia 0 - 1 Marruecos' },
  { matchId: '20260000-0000-0000-0000-000000000430', home: '9', away: '11', homeScore: 3, awayScore: 0, label: 'Grupo C: Brasil 3 - 0 Haití' },
  { matchId: '20260000-0000-0000-0000-000000000431', home: '16', away: '14', homeScore: 0, awayScore: 1, label: 'Grupo D: Turquía 0 - 1 Paraguay' },
  { matchId: '20260000-0000-0000-0000-000000000432', home: '13', away: '15', homeScore: 2, awayScore: 0, label: 'Grupo D: Estados Unidos 2 - 0 Australia' }
];

const matches = officialResults.map(result => ({
  id: result.matchId,
  kickoff_at: '2026-06-01T12:00:00Z',
  home_team: { id: supabaseTeamId(result.home), name: teamNameById(result.home) },
  away_team: { id: supabaseTeamId(result.away), name: teamNameById(result.away) }
}));

assert.strictEqual(officialResults.length, 32, 'La lista oficial debe tener 32 resultados finalizados');

for (const result of officialResults) {
  const item = {
    home_team_id: result.home,
    away_team_id: result.away,
    home_team_name_en: teamNameById(result.home),
    away_team_name_en: teamNameById(result.away),
    home_score: String(result.homeScore),
    away_score: String(result.awayScore),
    finished: 'TRUE'
  };
  assert.strictEqual(isApiItemFinished(item), true, `${result.label} debe considerarse finalizado`);
  const resolved = resolveExternalEvent(item, matches);
  assert(resolved, `${result.label} debe resolverse contra Supabase`);
  assert.strictEqual(resolved.match.id, result.matchId, `${result.label} debe apuntar al match_id correcto`);
  assert.strictEqual(resolved.homeScore, result.homeScore, `${result.label} debe mapear home_score`);
  assert.strictEqual(resolved.awayScore, result.awayScore, `${result.label} debe mapear away_score`);
}

console.log('WorldCup26 official results: OK');
