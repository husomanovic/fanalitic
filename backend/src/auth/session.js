import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'fanalitic_session';
export const SESSION_SECONDS = 8 * 60 * 60;

export function sessionOptions(production) {
  return { httpOnly: true, secure: production, sameSite: 'lax', path: '/' };
}

export function readSession(req, secret) {
  const value = req.headers.cookie?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!value || value.length > 4096) return null;
  try {
    const claims = jwt.verify(value, secret, {
      algorithms: ['HS256'], issuer: 'fanalitic', audience: 'fanalitic-admin',
    });
    return typeof claims.sub === 'string' && typeof claims.jti === 'string' ? claims : null;
  } catch {
    return null;
  }
}

export async function createSession(res, user, store, secret, production) {
  const sessionId = randomUUID();
  const token = jwt.sign({}, secret, {
    algorithm: 'HS256', subject: user.ID, jwtid: sessionId,
    issuer: 'fanalitic', audience: 'fanalitic-admin', expiresIn: SESSION_SECONDS,
  });
  await store.createSession(sessionId, user.ID, new Date(Date.now() + SESSION_SECONDS * 1000));
  res.cookie(COOKIE_NAME, token, {
    ...sessionOptions(production), maxAge: SESSION_SECONDS * 1000,
  });
}

export function requireAdmin(store, secret) {
  return async (req, res, next) => {
    try {
      const claims = readSession(req, secret);
      if (!claims) return res.status(401).json({ message: 'Please sign in.' });
      const user = await store.findSession(claims.jti, claims.sub);
      if (!user) return res.status(401).json({ message: 'Your session has expired. Please sign in.' });
      if (user.ROLE !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
      req.user = { id: user.ID, email: user.EMAIL, name: user.NAME, role: user.ROLE };
      req.sessionId = claims.jti;
      next();
    } catch (error) {
      next(error);
    }
  };
}
