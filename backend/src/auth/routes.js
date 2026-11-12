import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { COOKIE_NAME, createSession, readSession, requireAdmin, sessionOptions } from './session.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compare unknown accounts too, avoiding a fast response that reveals account existence.
const dummyHash = bcrypt.hashSync('not-a-real-account-password', 12);

function credentials(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  return { email, password };
}

export function createAuthRouter({ store, secret, production = false }) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  });
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/register', limiter, async (req, res, next) => {
    const { email, password } = credentials(req.body);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const errors = {};
    if (!emailPattern.test(email) || email.length > 254) errors.email = 'Enter a valid email.';
    if (!name || name.length > 100) errors.name = 'Enter a name between 1 and 100 characters.';
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      errors.password = 'Use at least 12 characters and no more than 72 UTF-8 bytes.';
    }
    if (password !== req.body?.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields.', errors });
    try {
      if (await store.findByEmail(email)) {
        return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
      }
      await store.createUser({
        ID: randomUUID(), EMAIL: email, NAME: name, PASSWORD_HASH: await bcrypt.hash(password, 12),
      });
      // Registration does not create a session; the new account signs in on the login page.
      return res.status(201).json({ message: 'Account created. You can now sign in.' });
    } catch (error) {
      // The store checks for duplicates inside the registration lock.
      if (error.sqlState === '23505') {
        return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
      }
      next(error);
    }
  });

  router.post('/login', limiter, async (req, res, next) => {
    const { email, password } = credentials(req.body);
    if (!emailPattern.test(email) || email.length > 254 || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Enter a valid email and password.' });
    }
    try {
      const user = await store.findByEmail(email);
      const matches = await bcrypt.compare(password, user?.PASSWORD_HASH || dummyHash);
      if (!user || !matches) return res.status(401).json({ message: 'Invalid email or password.' });
      if (user.ROLE !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
      const previous = readSession(req, secret);
      if (previous) await store.deleteSession(previous.jti);
      await createSession(res, user, store, secret, production);
      return res.json({ user: { id: user.ID, email: user.EMAIL, name: user.NAME, role: user.ROLE } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireAdmin(store, secret), (req, res) => res.json({ user: req.user }));

  router.post('/logout', async (req, res, next) => {
    try {
      const claims = readSession(req, secret);
      if (claims) await store.deleteSession(claims.jti);
      res.clearCookie(COOKIE_NAME, sessionOptions(production));
      res.json({ message: 'Signed out.' });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
