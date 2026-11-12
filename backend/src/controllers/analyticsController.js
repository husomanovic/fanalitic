import { getAnalytics } from '../services/analyticsService.js';

export function analyticsController(endpoint, query, { legacy = false } = {}) {
  return async (req, res) => {
    try {
      const input = { ...req.query };
      if (req.params.gameId !== undefined) input.gameId = req.params.gameId;
      const result = await getAnalytics(endpoint, input, query);
      res.json(legacy ? result.data : result);
    } catch (error) {
      if (error.status === 400) return res.status(400).json({ message: error.message });
      console.error(`Analytics ${endpoint} failed:`, error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  };
}
