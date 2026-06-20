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

const match = {
  id: 'match-1',
  kickoff_at: '2026-06-19T01:00:00Z',
  home_team: { name: 'México', code: 'MEX' },
  away_team: { name: 'Estados Unidos', code: 'USA' }
};
const resolved = internals.resolveExternalEvent({
  home_team_id: '1',
  away_team_id: '13',
  home_team_name_en: 'Mexico',
  away_team_name_en: 'United States',
  local_date: '06/19/2026 01:00',
  home_score: '2',
  away_score: '1',
  finished: 'TRUE'
}, [match]);

assert(resolved, 'Resuelve evento externo por equipos + fecha');
assert.strictEqual(resolved.match.id, 'match-1', 'Devuelve el partido interno correcto');
assert.strictEqual(resolved.homeScore, 2, 'Mapea marcador local');
assert.strictEqual(resolved.awayScore, 1, 'Mapea marcador visitante');

console.log('API provider mapping: OK');
