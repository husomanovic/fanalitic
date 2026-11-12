import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { createStadiumSectionsRouter } from '../src/routes/stadiumSectionsRouter.js';

const stadiums = [{ STADIUM_ID: 1, STADIUM_NAME: 'First Stadium' }, { STADIUM_ID: 2, STADIUM_NAME: 'Second Stadium' }, { STADIUM_ID: 3, STADIUM_NAME: 'Empty Stadium' }];
const reviews = [{ stadium: 1, game: 11, score: 5 }, { stadium: 1, game: 11, score: 5 }, { stadium: 1, game: 12, score: 5 }, { stadium: 2, game: 21, score: 1 }];

async function setup(t, query) {
  const app = express();
  app.use('/stadium-sections', createStadiumSectionsRouter(query));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}/stadium-sections`;
}

test('stadium filter scopes all-match statistics; all stadiums aggregate individual reviews', async t => {
  const calls = [];
  const base = await setup(t, async (sql, binds = []) => {
    calls.push({ sql, binds });
    if (sql.includes('PUBLIC_APP.STADIUMS')) return stadiums;
    assert.match(sql, /FROM READ_READY.REVIEWS_FACT/);
    assert.match(sql, /AVG\(OVERALL_SCORE\)/);
    assert(!sql.includes('GAME_METRICS'));
    const selected = binds.length ? reviews.filter(review => review.stadium === binds[0]) : reviews;
    const average = selected.length ? selected.reduce((sum, row) => sum + row.score, 0) / selected.length : null;
    if (sql.includes('GROUP BY SECTION')) return selected.length ? [{ SECTION: 'NORTH', REVIEW_COUNT: selected.length, AVG_OVERALL: average, AVG_SECURITY: average }] : [];
    return [{ REVIEW_COUNT: selected.length, MATCH_COUNT: new Set(selected.map(row => row.game)).size, AVG_OVERALL: average, AVG_SECURITY: average }];
  });
  const overall = await fetch(base);
  assert.equal(overall.status, 200);
  assert.equal(overall.headers.get('cache-control'), 'no-store');
  const all = await overall.json();
  assert.equal(all.summary.REVIEW_COUNT, 4);
  assert.equal(all.summary.AVG_OVERALL, 4); // review-weighted, not the stadium-average mean of 3.
  assert.equal(all.summary.MATCH_COUNT, 3);
  assert.equal(all.stadiums.length, 3);
  assert(calls.slice(1).every(call => !call.sql.includes('WHERE STADIUM_ID')));
  calls.length = 0;
  const chosen = await (await fetch(base + '?stadiumId=1')).json();
  assert.equal(chosen.stadium_id, 1);
  assert.equal(chosen.summary.REVIEW_COUNT, 3);
  assert.equal(chosen.sections[0].AVG_OVERALL, 5);
  assert(calls.slice(1).every(call => call.sql.includes('WHERE STADIUM_ID = ?') && call.binds[0] === 1));
  const empty = await (await fetch(base + '?stadiumId=3')).json();
  assert.deepEqual(empty.sections, []);
  assert.equal(empty.summary.REVIEW_COUNT, 0);
  assert.equal(empty.summary.AVG_OVERALL, null);
  assert.equal((await fetch(base + '?stadiumId=999')).status, 404);
});

test('invalid, repeated and injection-like stadium IDs never reach SQL', async t => {
  let calls = 0;
  const base = await setup(t, async () => { calls++; return []; });
  for (const params of ['stadiumId=0', 'stadiumId=-1', 'stadiumId=1.5', 'stadiumId=9007199254740992', 'stadiumId=1&stadiumId=2', 'stadiumId=1%20OR%201=1', 'gameId=1']) {
    assert.equal((await fetch(base + '?' + params)).status, 400, params);
  }
  assert.equal(calls, 0);
});

test('database failure returns a generic error for the retry UI', async t => {
  const base = await setup(t, async () => { throw Object.assign(new Error('private database details'), { code: 'TEST' }); });
  const response = await fetch(base);
  assert.equal(response.status, 500);
  const text = await response.text();
  assert(!text.includes('private database details'));
});
