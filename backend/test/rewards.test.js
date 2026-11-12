import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';
import express from 'express';
import { createRewardRouter } from '../src/routes/rewards.js';
import { createReviewRouter } from '../src/routes/reviews.js';
import { createRewardService, REWARDS, selectReward, TOTAL_WEIGHT } from '../src/services/rewardService.js';

const ticket = { TICKET_ID: 7, BARCODE: 'FANLYTICS-123456789', GAME_ID: 2, HOME_TEAM: 'Home', AWAY_TEAM: 'Away' };

function fixture({ reviewed = true, loseResponse = false } = {}) {
  const row = { REWARD_ID: null, REWARD_CODE: null, REWARD_SPUN_AT: null };
  let used = reviewed;
  let writes = 0;
  let draws = 0;
  let references = 0;
  const options = { draw: () => (++draws === 1 ? 999 : 0), code: () => `FAN-TEST-${++references}` };
  const query = async (sql, binds) => {
    if (sql.includes('SELECT REWARD_ID')) {
      assert.deepEqual(binds, [ticket.TICKET_ID, ticket.BARCODE]);
      return [{ ...row }];
    }
    if (sql.includes('FROM PUBLIC_APP.TICKETS')) return binds[0] === ticket.BARCODE ? [ticket] : [];
    if (sql.includes('UNION ALL')) return used ? [{ FLAG: 1 }] : [];
    if (sql.includes('INSERT INTO INGESTION.REVIEWS_IN')) {
      used = true;
      return [];
    }
    if (sql.includes('UPDATE PUBLIC_APP.TICKETS')) {
      assert.match(sql, /REWARD_ID IS NULL/);
      assert.deepEqual(binds.slice(2), [ticket.TICKET_ID, ticket.BARCODE]);
      await setImmediate();
      if (row.REWARD_ID === null) {
        writes++;
        Object.assign(row, { REWARD_ID: binds[0], REWARD_CODE: binds[1], REWARD_SPUN_AT: '2026-11-12T12:00:00Z' });
        if (loseResponse) throw new Error('Response lost after commit');
        return [{ 'number of rows updated': 1 }];
      }
      return [{ 'number of rows updated': 0 }];
    }
    throw new Error('Unexpected test query');
  };
  return { query, options, row, get writes() { return writes; }, get draws() { return draws; } };
}

test('exhaustive 1,000-outcome draw has exactly one jackpot and the advertised discount odds', () => {
  const counts = Object.fromEntries(REWARDS.map(prize => [prize.id, 0]));
  for (let draw = 0; draw < TOTAL_WEIGHT; draw++) counts[selectReward(draw).id]++;
  assert.deepEqual(Object.values(counts), [500, 280, 150, 60, 9, 1]);
  for (const invalid of [-1, 1000, 0.5, NaN]) assert.throws(() => selectReward(invalid));
});

test('unreviewed and invalid tickets cannot spin', async () => {
  const db = fixture({ reviewed: false });
  const service = createRewardService(db.query, db.options);
  assert.equal((await service.getStatus(ticket.BARCODE)).can_spin, false);
  await assert.rejects(service.spin(ticket.BARCODE), { status: 409 });
  await assert.rejects(service.spin('missing'), { status: 404 });
  await assert.rejects(service.spin(' '), { status: 400 });
  assert.equal(db.draws, 0);
  assert.equal(db.writes, 0);
});

test('concurrent requests and independent service instances share exactly one saved reward', async () => {
  const db = fixture();
  const services = [createRewardService(db.query, db.options), createRewardService(db.query, db.options)];
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) => services[index % 2].spin(ticket.BARCODE)));
  assert.equal(db.writes, 1);
  assert.equal(results.filter(result => !result.already_spun).length, 1);
  assert.equal(new Set(results.map(result => result.reward.code)).size, 1);
  assert.equal(new Set(results.map(result => result.reward.id)).size, 1);
  const draws = db.draws;
  const reloaded = createRewardService(db.query, db.options);
  assert.equal((await reloaded.getStatus(ticket.BARCODE)).can_spin, false);
  assert.deepEqual((await reloaded.spin(ticket.BARCODE)).reward, results[0].reward);
  assert.equal(db.draws, draws);
});

test('a lost response after saving recovers the original reward without another draw', async () => {
  const db = fixture({ loseResponse: true });
  const service = createRewardService(db.query, db.options);
  await assert.rejects(service.spin(ticket.BARCODE), /Response lost/);
  const recovered = await service.getStatus(ticket.BARCODE);
  assert.equal(recovered.can_spin, false);
  assert.equal(recovered.reward.id, 'discount-100');
  assert.equal((await service.spin(ticket.BARCODE)).already_spun, true);
  assert.equal(db.writes, 1);
  assert.equal(db.draws, 1);
});

test('malformed saved rewards fail closed instead of awarding another prize', async () => {
  const db = fixture();
  db.row.REWARD_ID = 'unknown-prize';
  await assert.rejects(createRewardService(db.query, db.options).spin(ticket.BARCODE), /Invalid saved reward/);
  assert.equal(db.draws, 0);
});

test('HTTP review submission unlocks one spin; repeat POST and refresh restore the same reward', async t => {
  const db = fixture({ reviewed: false });
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', createReviewRouter(db.query));
  app.use('/api/tickets', createRewardRouter(db.query, { ...db.options, draw: () => 0 }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, body = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const path = `/api/tickets/${ticket.BARCODE}`;
  assert.equal((await post(`${path}/spin`)).status, 409);
  assert.equal((await fetch(`${base}/api/tickets/missing/reward`)).status, 404);
  const review = { ticket_code: ticket.BARCODE, ...Object.fromEntries(['overall', 'security', 'organization', 'family_friendly', 'experience', 'comfort', 'game'].map(key => [`${key}_score`, 3])) };
  assert.equal((await post('/api/reviews', review)).status, 202);
  const available = await fetch(base + path + '/reward');
  assert.equal(available.headers.get('cache-control'), 'no-store');
  const state = await available.json();
  assert.equal(state.can_spin, true);
  assert.equal(state.prizes.find(prize => prize.id === 'discount-100').chance, 0.001);
  const spin = await post(`${path}/spin`, { reward_id: 'discount-100', discount_percent: 100 });
  assert.equal(spin.status, 200);
  const outcome = await spin.json();
  assert.equal(outcome.reward.id, 'discount-5');
  assert.equal(outcome.already_spun, false);
  const repeated = await post(`${path}/spin`);
  assert.deepEqual((await repeated.json()).reward, outcome.reward);
  const refresh = await (await fetch(base + path + '/reward')).json();
  assert.equal(refresh.can_spin, false);
  assert.deepEqual(refresh.reward, outcome.reward);
  assert.equal(db.writes, 1);
});
