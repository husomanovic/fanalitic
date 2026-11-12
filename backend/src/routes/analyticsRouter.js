import express from 'express';
import { analyticsController } from '../controllers/analyticsController.js';

export function createAnalyticsRouter(query) {
  const router = express.Router();
  // Mounted at /api/analytics in src/server.js. All endpoints below use GET.
  router.get('/summary', analyticsController('summary', query));
  router.get('/games', analyticsController('games', query, { legacy: true }));
  router.get('/stadiums', analyticsController('stadiums', query));
  router.get('/sections', analyticsController('sections', query));
  router.get('/sections/:gameId', analyticsController('sections', query, { legacy: true }));
  router.get('/cities', analyticsController('cities', query));
  router.get('/teams', analyticsController('teams', query));
  router.get('/categories', analyticsController('categories', query));
  router.get('/distribution', analyticsController('distribution', query));
  router.get('/trends', analyticsController('trends', query));
  router.get('/rating-matrix', analyticsController('rating-matrix', query));
  router.get('/seat-heatmap', analyticsController('seat-heatmap', query));
  router.get('/reviews', analyticsController('reviews', query));
  router.get('/feedback', analyticsController('feedback', query));
  router.get('/low-scores', analyticsController('low-scores', query));
  router.get('/correlations', analyticsController('correlations', query));
  router.get('/filter-options', analyticsController('filter-options', query));
  router.get('/freshness', analyticsController('freshness', query));
  return router;
}
