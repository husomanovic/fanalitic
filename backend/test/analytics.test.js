import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { parseAnalyticsFilters } from '../src/utils/analyticsFilters.js';
import { analyticsEndpoints, buildAnalyticsQuery } from '../src/repositories/analyticsRepository.js';
import { getAnalytics } from '../src/services/analyticsService.js';
import { createAnalyticsRouter } from '../src/routes/analyticsRouter.js';

test('rejects invalid, repeated, unknown and unsafe filters', () => {
  for (const input of [{gameId:'0'}, {gameId:'9007199254740992'}, {limit:'501'}, {offset:'-1'},
    {metric:'OVERALL_SCORE; DROP TABLE X'}, {metric:'toString'}, {interval:'year'},
    {dateFrom:'2026-02-30'}, {dateFrom:'2026-03-02',dateTo:'2026-03-01'},
    {minScore:'5',maxScore:'1'}, {team:['a','b']}, {sort:'random'}, {minReviews:'0'}]) {
    assert.throws(() => parseAnalyticsFilters(input), {status:400});
  }
});

test('binds user values and makes end date inclusive', () => {
  const attack = "x' OR 1=1 --";
  const f = parseAnalyticsFilters({team:attack,section:attack,dateTo:'2026-11-12',metric:'security',minScore:'2'});
  const q = buildAnalyticsQuery('summary', f);
  assert.ok(!q.sqlText.includes(attack));
  assert.deepEqual(q.binds, [attack,attack,attack,'2026-11-12',2]);
  assert.match(q.sqlText, /GAME_DATE < DATEADD\(day, 1, TO_DATE\(\?\)\)/);
  assert.match(q.sqlText, /SECURITY_SCORE >= \?/);
});

test('every route builds a query with balanced binds and no private output fields', () => {
  for (const endpoint of analyticsEndpoints) {
    const q = buildAnalyticsQuery(endpoint, parseAnalyticsFilters({gameId:'1',stadiumId:'2',minReviews:'3'}));
    assert.equal((q.sqlText.match(/\?/g) || []).length, q.binds.length, endpoint);
    assert.ok(!/TICKET_CODE|BARCODE|PASSWORD_HASH/.test(q.sqlText));
    assert.match(q.sqlText, /READ_READY.REVIEWS_FACT/);
  }
});

test('pagination detects next page and removes the extra row', async () => {
  const result = await getAnalytics('reviews', {limit:'2',offset:'10'}, async (sql, binds) => {
    assert.deepEqual(binds, [3,10]);
    return [{GAME_ID:1},{GAME_ID:2},{GAME_ID:3}];
  });
  assert.equal(result.data.length, 2);
  assert.equal(result.meta.hasMore, true);
  const empty = await getAnalytics('reviews', {}, async () => []);
  assert.deepEqual(empty.data, []);
  assert.equal(empty.meta.hasMore, false);
});

test('HTTP routes preserve legacy arrays, reject invalid input before queries, and hide database errors', async t => {
  const calls = [];
  const app = express();
  app.use('/api/analytics', createAnalyticsRouter(async (sql, binds) => {
    calls.push({sql,binds});
    return [{REVIEW_COUNT:3}];
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api/analytics`;
  for (const endpoint of analyticsEndpoints) {
    const res = await fetch(`${base}/${endpoint}`);
    assert.equal(res.status,200,endpoint);
    const body = await res.json();
    assert.ok(Array.isArray(endpoint === 'games' ? body : body.data),endpoint);
  }
  const sections = await fetch(`${base}/sections/42`);
  assert.ok(Array.isArray(await sections.json()));
  assert.equal(calls.at(-1).binds[0],42);
  const before = calls.length;
  for (const path of ['/summary?metric=bad','/sections/nope','/reviews?limit=501','/summary?team=a&team=b']) {
    assert.equal((await fetch(base+path)).status,400);
  }
  assert.equal(calls.length,before);
});

test('controller returns a generic database error', async () => {
  const { analyticsController } = await import('../src/controllers/analyticsController.js');
  const original = console.error;
  console.error = () => {};
  try {
    let status, body;
    const res = {status(value){status=value;return this;},json(value){body=value;}};
    await analyticsController('summary',async()=>{throw new Error('secret credentials');})({query:{},params:{}},res);
    assert.equal(status,500);
    assert.deepEqual(body,{message:'Failed to fetch analytics'});
  } finally {console.error=original;}
});
