const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadRankings({ settings, rankingData }) {
  const context = {
    window: {
      Pronostix: {
        state: { settings },
        money: n => `$${Number(n || 0).toFixed(2)}`,
        dt: v => v,
        esc: s => String(s ?? '')
      },
      PronostixUI: {
        userChip: user => user.display_name || user.username || user.id,
        badge: status => status
      },
      PronostixData: {
        loadAllForRanking: async () => rankingData
      }
    },
    console
  };
  context.global = context;
  vm.runInNewContext(fs.readFileSync('js/rankings.js', 'utf8'), context, { filename: 'js/rankings.js' });
  return context.window.PronostixRankings;
}

const settings = {
  entry_fee: 200,
  admin_percentage: 10,
  first_place_percentage: 50,
  second_place_percentage: 25,
  third_place_percentage: 15
};

function row(id, position, points = 0, payment_status = 'PAID') {
  return { id, username: id, display_name: id, position, total_points: points, special_points: 0, payment_status };
}

function assertPrizePlan(name, rows, participantCount, expectations) {
  const rankings = loadRankings({ settings, rankingData: emptyRankingData() });
  const plan = rankings.prizePlan(rows, participantCount);
  assert.strictEqual(plan.pool, participantCount * 200, `${name}: bolsa total`);
  assert.strictEqual(plan.adminFee, participantCount * 20, `${name}: comisión admin`);
  assert.strictEqual(plan.netPool, participantCount * 180, `${name}: bolsa neta`);
  for (const expectation of expectations) {
    const place = plan.places.find(item => item.place === expectation.place);
    assert(place, `${name}: existe lugar ${expectation.place}`);
    assert.strictEqual(place.winners.length, expectation.winners, `${name}: ganadores lugar ${expectation.place}`);
    assert.strictEqual(place.prize, expectation.prize, `${name}: premio lugar ${expectation.place}`);
    assert.strictEqual(place.each, expectation.each, `${name}: premio individual lugar ${expectation.place}`);
  }
  console.log(`${name}: OK`);
}

function emptyRankingData() {
  return {
    profiles: [],
    predictions: [],
    specialPredictions: [],
    specialResults: null,
    matches: []
  };
}

async function assertRankingFilters() {
  const rankingData = {
    profiles: [
      { id: 'pagado-1', username: 'pagado-1', display_name: 'Pagado 1', payment_status: 'PAID' },
      { id: 'pagado-2', username: 'pagado-2', display_name: 'Pagado 2', payment_status: 'PAID' },
      { id: 'nopagado-1', username: 'nopagado-1', display_name: 'No pagado 1', payment_status: 'UNPAID' }
    ],
    predictions: [],
    specialPredictions: [],
    specialResults: null,
    matches: []
  };
  const rankings = loadRankings({ settings, rankingData });
  const general = await rankings.calculateRows(false);
  const official = await rankings.calculateRows(true);
  assert.strictEqual(general.length, 3, 'Ranking general incluye todos los usuarios');
  assert.strictEqual(official.length, 2, 'Ranking oficial incluye solo pagados');
  assert(official.every(row => row.payment_status === 'PAID'), 'Ranking oficial no incluye no pagados');
  console.log('Ranking general/oficial: OK');
}


async function assertTemporarySpecialPoints() {
  const rankingData = {
    profiles: [
      { id: 'usuario2026', username: 'usuario2026', display_name: 'Usuario Demo', payment_status: 'PAID' }
    ],
    predictions: [],
    specialPredictions: [{
      user_id: 'usuario2026',
      champion_team_id: 'mexico',
      runner_up_team_id: 'francia',
      third_place_team_id: 'inglaterra',
      top_scorer_player_id: 'mbappe',
      best_player_id: 'bellingham',
      best_goalkeeper_id: 'courtois',
      updated_at: '2026-06-18T00:00:00Z'
    }],
    specialResults: {
      champion_team_id: 'mexico',
      runner_up_team_id: 'francia',
      third_place_team_id: 'inglaterra',
      top_scorer_player_id: 'mbappe',
      best_player_id: 'bellingham',
      best_goalkeeper_id: 'courtois'
    },
    matches: []
  };
  const rankings = loadRankings({ settings, rankingData });
  const rows = await rankings.calculateRows(false);
  assert.strictEqual(rows[0].special_points, 25, 'Especiales temporales suman 25 puntos cuando coinciden todos');
  assert.strictEqual(rows[0].total_points, 25, 'Total incluye puntos de especiales temporales');
  console.log('Especiales temporales en ranking: OK');
}

async function run() {
  assertPrizePlan('Caso 1: un solo ganador', [row('u1', 1), row('u2', 2), row('u3', 3)], 3, [
    { place: 1, winners: 1, prize: 300, each: 300 },
    { place: 2, winners: 1, prize: 150, each: 150 },
    { place: 3, winners: 1, prize: 90, each: 90 }
  ]);

  assertPrizePlan('Caso 2: empate en primer lugar', [row('u1', 1), row('u2', 1), row('u3', 2)], 3, [
    { place: 1, winners: 2, prize: 300, each: 150 },
    { place: 2, winners: 1, prize: 150, each: 150 },
    { place: 3, winners: 0, prize: 90, each: 0 }
  ]);

  assertPrizePlan('Caso 3: empate en segundo lugar', [row('u1', 1), row('u2', 2), row('u3', 2), row('u4', 3)], 4, [
    { place: 1, winners: 1, prize: 400, each: 400 },
    { place: 2, winners: 2, prize: 200, each: 100 },
    { place: 3, winners: 1, prize: 120, each: 120 }
  ]);

  assertPrizePlan('Caso 4: empate en tercer lugar', [row('u1', 1), row('u2', 2), row('u3', 3), row('u4', 3)], 4, [
    { place: 1, winners: 1, prize: 400, each: 400 },
    { place: 2, winners: 1, prize: 200, each: 200 },
    { place: 3, winners: 2, prize: 120, each: 60 }
  ]);

  assertPrizePlan('Caso 5: empate múltiple', [row('u1', 1), row('u2', 1), row('u3', 2), row('u4', 2), row('u5', 3), row('u6', 3)], 6, [
    { place: 1, winners: 2, prize: 600, each: 300 },
    { place: 2, winners: 2, prize: 300, each: 150 },
    { place: 3, winners: 2, prize: 180, each: 90 }
  ]);

  assertPrizePlan('Caso 6: sin ganadores en alguna posición', [row('u1', 1), row('u2', 1), row('u3', 2)], 3, [
    { place: 1, winners: 2, prize: 300, each: 150 },
    { place: 2, winners: 1, prize: 150, each: 150 },
    { place: 3, winners: 0, prize: 90, each: 0 }
  ]);

  await assertRankingFilters();
  await assertTemporarySpecialPoints();
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
