import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';

const secret = 'test-only-secret-at-least-thirty-two-bytes';
const origin = 'http://localhost:3000';
const account = { name: 'Admin Example', email: 'ADMIN@example.com', password: 'a good password 123', confirmPassword: 'a good password 123' };

async function fixture(t, production = false) {
  const users = new Map();
  const sessions = new Map();
  const store = {
    async findByEmail(email) { return users.get(email); },
    async createUser(user) {
      if (users.has(user.EMAIL)) throw Object.assign(new Error('Duplicate email'), { sqlState: '23505' });
      const result = { ...user, ROLE: 'admin' };
      users.set(user.EMAIL, result);
      return result;
    },
    async createSession(id, userId, expiresAt) { sessions.set(id, { userId, expiresAt }); },
    async findSession(id, userId) {
      const session = sessions.get(id);
      if (!session || session.userId !== userId || session.expiresAt <= new Date()) return undefined;
      return [...users.values()].find(user => user.ID === userId);
    },
    async deleteSession(id) { sessions.delete(id); },
  };
  const server = createApp({ store, secret, origin, production }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', body, cookie, requestOrigin = origin } = {}) {
    return fetch(`${base}${path}`, {
      method,
      headers: { Origin: requestOrigin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  return { users, sessions, request };
}

function getCookie(response) {
  return response.headers.get('set-cookie').split(';')[0];
}

test('register, hash, login, authorize, reject tampering, and revoke logout session', async t => {
  const { users, sessions, request } = await fixture(t);
  assert.equal((await request('/api/analytics/games')).status, 401);
  assert.equal((await request('/api/auth/me')).status, 401);
  const registration = await request('/api/auth/register', { method: 'POST', body: account });
  assert.equal(registration.status, 201);
  assert.equal(registration.headers.get('set-cookie'), null);
  const user = users.get('admin@example.com');
  assert.notEqual(user.PASSWORD_HASH, account.password);
  assert.equal(bcrypt.getRounds(user.PASSWORD_HASH), 12);
  assert(await bcrypt.compare(account.password, user.PASSWORD_HASH));
  assert.equal((await request('/api/auth/register', { method: 'POST', body: { ...account, email: 'admin@example.com' } })).status, 409);
  const badLogin = await request('/api/auth/login', { method: 'POST', body: { ...account, password: 'wrong password' } });
  assert.equal(badLogin.status, 401);
  assert.equal(badLogin.headers.get('set-cookie'), null);
  const login = await request('/api/auth/login', { method: 'POST', body: account });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  assert.match(login.headers.get('set-cookie'), /SameSite=Lax/);
  assert.match(login.headers.get('set-cookie'), /Path=\//);
  assert(!JSON.stringify(await login.json()).includes('PASSWORD_HASH'));
  const cookie = getCookie(login);
  const me = await request('/api/auth/me', { cookie });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.email, 'admin@example.com');
  const token = cookie.slice(cookie.indexOf('=') + 1);
  const claims = jwt.decode(token);
  const forged = jwt.sign({}, 'different-secret', { subject: user.ID, jwtid: claims.jti });
  assert.equal((await request('/api/auth/me', { cookie: `fanalitic_session=${forged}` })).status, 401);
  const expired = jwt.sign({}, secret, { subject: user.ID, jwtid: claims.jti, issuer: 'fanalitic', audience: 'fanalitic-admin', expiresIn: -1 });
  assert.equal((await request('/api/auth/me', { cookie: `fanalitic_session=${expired}` })).status, 401);
  user.ROLE = 'viewer';
  assert.equal((await request('/api/auth/me', { cookie })).status, 403);
  assert.equal((await request('/api/analytics/games', { cookie })).status, 403);
  user.ROLE = 'admin';
  const logout = await request('/api/auth/logout', { method: 'POST', cookie });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  assert.equal(sessions.size, 0);
  assert.equal((await request('/api/auth/me', { cookie })).status, 401);
});

test('registration validates name, email, confirmation, minimum length, and bcrypt byte limit', async t => {
  const { request, users } = await fixture(t);
  for (const patch of [
    { name: '' }, { email: 'not-an-email' }, { password: 'short', confirmPassword: 'short' },
    { confirmPassword: 'different' }, { password: 'x'.repeat(73), confirmPassword: 'x'.repeat(73) },
    { password: '\u{1F600}'.repeat(20), confirmPassword: '\u{1F600}'.repeat(20) },
  ]) {
    const response = await request('/api/auth/register', { method: 'POST', body: { ...account, ...patch } });
    assert.equal(response.status, 400);
    assert(Object.keys((await response.json()).errors).length > 0);
  }
  assert.equal(users.size, 0);
});

test('concurrent registrations enforce one account and reject unauthorized origins', async t => {
  const { request, users } = await fixture(t);
  const responses = await Promise.all([1, 2].map(() => request('/api/auth/register', { method: 'POST', body: account })));
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  assert.equal(users.size, 1);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: account, requestOrigin: 'https://attacker.example' })).status, 403);
  assert.equal((await request('/api/auth/logout', { method: 'POST', requestOrigin: '' })).status, 403);
});

test('production session cookies are secure and expired database sessions are rejected', async t => {
  const { request, sessions } = await fixture(t, true);
  await request('/api/auth/register', { method: 'POST', body: account });
  const login = await request('/api/auth/login', { method: 'POST', body: account });
  assert.match(login.headers.get('set-cookie'), /Secure/);
  const cookie = getCookie(login);
  for (const session of sessions.values()) session.expiresAt = new Date(0);
  assert.equal((await request('/api/auth/me', { cookie })).status, 401);
});

test('login attempts are rate limited', async t => {
  const { request } = await fixture(t);
  for (let index = 0; index < 20; index++) {
    assert.equal((await request('/api/auth/login', { method: 'POST', body: {} })).status, 400);
  }
  const blocked = await request('/api/auth/login', { method: 'POST', body: {} });
  assert.equal(blocked.status, 429);
});
