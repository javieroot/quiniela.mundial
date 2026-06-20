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

const internals = context.window.PronostixAdmin._internals;

assert.strictEqual(
  internals.buildResultsApiUrl({ results_api_provider: 'worldcup26', results_api_base_url: '' }),
  'https://worldcup26.ir/get/games',
  'Usa worldcup26.ir/get/games como endpoint por defecto'
);

assert(internals.teamNameMatches('Mexico', { name: 'México', code: 'MEX' }), 'Empata México/Mexico sin acentos');
assert(internals.teamNameMatches('United States', { name: 'Estados Unidos', code: 'USA' }), 'Empata Estados Unidos/United States');
assert.strictEqual(context.window.PronostixWorldCup26.teamIdMatches('1', { id: '20260000-0000-0000-0000-000000000201', name: 'México' }), true, 'Permite probar empates por IDs externos del proveedor');
assert.strictEqual(context.window.PronostixWorldCup26.supabaseTeamId('17'), '20260000-0000-0000-0000-000000000219', 'worldcup26 team_id 17 corresponde a Alemania en Supabase');
assert.strictEqual(context.window.PronostixWorldCup26.supabaseTeamId('19'), '20260000-0000-0000-0000-000000000217', 'worldcup26 team_id 19 corresponde a Costa de Marfil en Supabase');
assert.strictEqual(context.window.PronostixWorldCup26.supabaseTeamId('25'), '20260000-0000-0000-0000-000000000227', 'worldcup26 team_id 25 corresponde a Bélgica en Supabase');
assert.strictEqual(context.window.PronostixWorldCup26.supabaseTeamId('29'), '20260000-0000-0000-0000-000000000231', 'worldcup26 team_id 29 corresponde a España en Supabase');
assert.strictEqual(context.window.PronostixWorldCup26.supabaseTeamId('45'), '20260000-0000-0000-0000-000000000247', 'worldcup26 team_id 45 corresponde a Inglaterra en Supabase');

const match = {
  id: 'match-1',
  kickoff_at: '2026-06-19T01:00:00Z',
  home_team: { id: '20260000-0000-0000-0000-000000000201', name: 'México', code: 'MEX' },
  away_team: { id: '20260000-0000-0000-0000-000000000213', name: 'Estados Unidos', code: 'USA' }
};
const resolved = internals.resolveExternalEvent({
  home_team_id: '1',
  away_team_id: '13',
  home_team_name_en: 'Mexico',
  away_team_name_en: 'United States',
  local_date: '06/01/2026 01:00',
  home_score: '2',
  away_score: '1',
  finished: 'TRUE'
}, [match]);

assert.strictEqual(context.window.PronostixWorldCup26.teamNameById('45'), 'Inglaterra', 'Traduce team_id de grupos a nombre visible');
assert(resolved, 'Resuelve evento externo por ID de proveedor aunque la fecha no coincida');
assert.strictEqual(resolved.match.id, 'match-1', 'Devuelve el partido interno correcto');
assert.strictEqual(resolved.homeScore, 2, 'Mapea marcador local');
assert.strictEqual(resolved.awayScore, 1, 'Mapea marcador visitante');

assert.strictEqual(internals.isApiItemFinished({ finished: 'FALSE', home_score: '0', away_score: '0' }), false, 'Omite partidos no finalizados aunque traigan ceros');
assert.strictEqual(internals.isApiItemFinished({ finished: 'TRUE' }), true, 'Acepta partidos finalizados');

console.log('API provider mapping: OK');
