import express from 'express';
import cors from 'cors';
import ticketRoutes from './routes/tickets.js';
import reviewRoutes from './routes/reviews.js';
import rewardRoutes from './routes/rewards.js';
import analyticsRoutes from './routes/analytics.js';
import { authStore } from './auth/store.js';
import { createAuthRouter } from './auth/routes.js';
import { requireAdmin } from './auth/session.js';

export function createApp({ secret, origin, production = false, store = authStore }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  // Browser requests arrive through Next.js rewrites with their original Origin.
  app.use((req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== origin) {
      return res.status(403).json({ message: 'Request origin is not allowed.' });
    }
    next();
  });
  app.use('/api/auth', createAuthRouter({ store, secret, production }));
  app.use('/api/tickets', rewardRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/analytics', requireAdmin(store, secret), analyticsRoutes);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
    // Database errors may contain SQL and bind values; never log raw auth errors.
    console.error('API request failed', { code: error.code, sqlState: error.sqlState });
    res.status(500).json({ message: 'The service is unavailable. Please try again later.' });
  });
  return app;
}
