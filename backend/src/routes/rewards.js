import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { query } from '../config/snowflake.js';
import { createRewardService } from '../services/rewardService.js';

export function createRewardRouter(runQuery = query, options) {
  const router = Router();
  const service = createRewardService(runQuery, options);
  const spinLimit = rateLimit({
    windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Too many requests. Please try again in a minute.' },
  });
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  const handle = action => async (req, res) => {
    try {
      res.json(await service[action](req.params.barcode));
    } catch (error) {
      if ([400, 404, 409].includes(error.status)) return res.status(error.status).json({ message: error.message });
      console.error('Ticket reward request failed', { code: error.code });
      res.status(503).json({ message: 'Your review is safe. Rewards are temporarily unavailable. Please try again.' });
    }
  };
  router.get('/:barcode/reward', handle('getStatus'));
  router.post('/:barcode/spin', spinLimit, handle('spin'));
  return router;
}

export default createRewardRouter();
