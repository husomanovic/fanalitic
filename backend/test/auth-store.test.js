import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { createAuthStore } from '../src/auth/store.js';

const user = { ID: 'one', EMAIL: 'admin@example.com', NAME: 'Admin', PASSWORD_HASH: 'test-hash' };

test('standard-table store serializes concurrent account creation for the same email', async () => {
  const rows = [];
  const store = createAuthStore(async (sql, binds) => {
    if (sql.trim().startsWith('SELECT')) return rows.filter(row => row.EMAIL === binds[0]);
    await setImmediate();
    rows.push({ ID: binds[0], EMAIL: binds[1], NAME: binds[2], PASSWORD_HASH: binds[3] });
    return [];
  });
  const results = await Promise.allSettled([
    store.createUser(user), store.createUser({ ...user, ID: 'two' }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.sqlState, '23505');
});

test('registration lock releases after a failed database request', async () => {
  let fail = true;
  const store = createAuthStore(async () => {
    if (fail) { fail = false; throw new Error('Database unavailable'); }
    return [];
  });
  await assert.rejects(store.createUser(user), /Database unavailable/);
  assert.equal((await store.createUser(user)).ID, user.ID);
});

test('ambiguous account and session records fail closed', async () => {
  const store = createAuthStore(async () => [user, { ...user, ID: 'two' }]);
  await assert.rejects(store.findByEmail(user.EMAIL), /Duplicate account/);
  await assert.rejects(store.findSession('session', user.ID), /Duplicate session/);
});
