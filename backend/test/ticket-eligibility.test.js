import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { getTicketEligibility, normalizeTicketCode } from '../src/services/ticketEligibilityService.js';
import { createTicketRouter } from '../src/routes/tickets.js';
import { createReviewRouter } from '../src/routes/reviews.js';

const ticket = { TICKET_ID: 7, BARCODE: 'ABC', GAME_ID: 2, HOME_TEAM: 'Home', AWAY_TEAM: 'Away', GAME_DATE: '2026-11-12T18:00:00', SECTION: 'A' };

test('validates codes, preserves leading zeros, and binds values', async () => {
  for (const value of [undefined, null, '', ' ', 123, 'a'.repeat(256)]) assert.throws(() => normalizeTicketCode(value), {status:400});
  assert.equal(normalizeTicketCode(' 00123 '), '00123');
  const attack = "x' OR 1=1 --";
  await getTicketEligibility(attack, async (sql, binds) => {
    assert.ok(!sql.includes(attack));
    assert.deepEqual(binds, [attack]);
    return [];
  });
});

test('unused ticket returns true and match information; used ticket returns false', async () => {
  for (const used of [false,true]) {
    let call = 0;
    const result = await getTicketEligibility(' ABC ', async (sql, binds) => {
      if (++call === 1) return [ticket];
      assert.match(sql, /PUBLIC_APP.REVIEWS/);
      assert.match(sql, /READ_READY.REVIEWS_FACT/);
      assert.match(sql, /INGESTION.REVIEWS_IN/);
      assert.deepEqual(binds, [7,7,'ABC','ABC']);
      return used ? [{FLAG:1}] : [];
    });
    assert.equal(result.can_review,!used);
    assert.equal(result.review_used,used);
    assert.equal(result.ticket.HOME_TEAM,'Home');
    assert.equal(result.ticket.GAME_DATE,ticket.GAME_DATE);
  }
});

test('direct fact submission immediately marks the ticket used', async t => {
  let used = false;
  let writes = 0;
  let fail = false;
  const query = async (sql, binds) => {
    if (fail) throw new Error('private database detail');
    if (sql.includes('INSERT INTO')) { writes++; used = true; assert.match(sql, /INSERT INTO READ_READY.REVIEWS_FACT/); assert.equal(binds.at(-1),'ABC'); return [{ 'number of rows inserted': 1 }]; }
    if (sql.includes('FROM PUBLIC_APP.TICKETS')) return binds[0] === 'MISSING' ? [] : [ticket];
    return used ? [{FLAG:1}] : [];
  };
  const app = express();
  app.use(express.json());
  app.use('/api/tickets',createTicketRouter(query));
  app.use('/api/reviews',createReviewRouter(query));
  const server = app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject) => {server.once('listening',resolve);server.once('error',reject);});
  t.after(()=>server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  let response = await fetch(`${base}/api/tickets/ABC/eligibility`);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).can_review,true);
  response = await fetch(`${base}/api/tickets/MISSING/eligibility`);
  assert.equal(response.status,404);
  assert.equal((await response.json()).can_review,false);
  response = await fetch(`${base}/api/tickets/%20/eligibility`);
  assert.equal(response.status,400);
  const review = { ticket_code:' ABC ', ...Object.fromEntries(['overall','security','organization','family_friendly','experience','comfort','game'].map(key=>[`${key}_score`,4])) };
  const post = () => fetch(`${base}/api/reviews`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(review)});
  assert.equal((await post()).status,201);
  response = await fetch(`${base}/api/tickets/ABC/eligibility`);
  assert.equal((await response.json()).can_review,false);
  assert.equal((await post()).status,409);
  assert.equal(writes,1);
  response = await fetch(`${base}/api/tickets/ABC`);
  const legacy = await response.json();
  assert.equal(legacy.HOME_TEAM,'Home');
  assert.equal(legacy.review_used,true);
  fail = true;
  response = await fetch(`${base}/api/tickets/ABC/eligibility`);
  assert.equal(response.status,500);
  assert.equal((await response.json()).can_review,false);
});
