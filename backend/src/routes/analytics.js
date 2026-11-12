import express from 'express';
import { query } from '../config/snowflake.js';

const router = express.Router();

router.get('/games', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        GAME_ID,
        HOME_TEAM,
        AWAY_TEAM,
        GAME_DATE,
        REVIEW_COUNT,
        ROUND(AVG_OVERALL, 2) AS AVG_OVERALL,
        ROUND(AVG_SECURITY, 2) AS AVG_SECURITY,
        ROUND(AVG_FAMILY_FRIENDLY, 2)
          AS AVG_FAMILY_FRIENDLY
      FROM READ_READY.GAME_METRICS
      ORDER BY GAME_DATE DESC
      LIMIT 100
    `);

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch analytics'
    });
  }
});

router.get('/sections/:gameId', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);

    if (!Number.isSafeInteger(gameId) || gameId <= 0) {
      return res.status(400).json({
        message: 'Invalid game ID'
      });
    }

    const rows = await query(`
      SELECT
        SECTION,
        COUNT(*) AS REVIEW_COUNT,
        ROUND(AVG(OVERALL_SCORE), 2)
          AS AVG_OVERALL,
        ROUND(AVG(SECURITY_SCORE), 2)
          AS AVG_SECURITY
      FROM READ_READY.REVIEWS_FACT
      WHERE GAME_ID = ?
      GROUP BY SECTION
      ORDER BY SECTION
    `, [gameId]);

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch section analytics'
    });
  }
});

export default router;

