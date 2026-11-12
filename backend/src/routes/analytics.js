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

router.get('/reviews', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        HOME_TEAM,
        AWAY_TEAM,
        SECTION,
        OVERALL_SCORE,
        SECURITY_SCORE,
        COMFORT_SCORE,
        GAME_SCORE,
        FEEDBACK_TEXT,
        INGESTED_AT
      FROM READ_READY.REVIEWS_FACT
      WHERE FEEDBACK_TEXT IS NOT NULL
        AND FEEDBACK_TEXT <> ''
      ORDER BY INGESTED_AT DESC
      LIMIT 40
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch reviews'
    });
  }
});

router.get('/security', async (req, res) => {
  try {
    const sections = await query(`
      SELECT
        SECTION,
        COUNT(*) AS REVIEW_COUNT,
        ROUND(AVG(SECURITY_SCORE), 2) AS AVG_SECURITY,
        ROUND(AVG(OVERALL_SCORE), 2) AS AVG_OVERALL
      FROM READ_READY.REVIEWS_FACT
      GROUP BY SECTION
      ORDER BY AVG_SECURITY
    `);

    const matches = await query(`
      SELECT
        GAME_ID,
        HOME_TEAM,
        AWAY_TEAM,
        GAME_DATE,
        REVIEW_COUNT,
        ROUND(AVG_SECURITY, 2) AS AVG_SECURITY,
        ROUND(AVG_OVERALL, 2) AS AVG_OVERALL
      FROM READ_READY.GAME_METRICS
      ORDER BY AVG_SECURITY ASC, GAME_DATE DESC
      LIMIT 12
    `);

    res.json({ sections, matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch security analytics'
    });
  }
});

export default router;

