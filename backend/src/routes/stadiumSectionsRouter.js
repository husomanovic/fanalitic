import { Router } from 'express';

export function createStadiumSectionsRouter(query) {
  const router = Router();
  router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const input = req.query.stadiumId;
    if (Object.keys(req.query).some(key => key !== 'stadiumId') ||
        (input !== undefined && (typeof input !== 'string' || !/^\d+$/.test(input) || !Number.isSafeInteger(Number(input)) || Number(input) <= 0))) {
      return res.status(400).json({ message: 'Choose a valid stadium.' });
    }
    const stadiumId = input === undefined ? null : Number(input);
    try {
      const stadiums = await query(`
        SELECT ID AS STADIUM_ID, NAME AS STADIUM_NAME, CITY AS STADIUM_CITY
        FROM PUBLIC_APP.STADIUMS ORDER BY NAME, ID
      `);
      if (stadiumId !== null && !stadiums.some(stadium => Number(stadium.STADIUM_ID) === stadiumId)) {
        return res.status(404).json({ message: 'Stadium not found.' });
      }
      const where = stadiumId === null ? '' : 'WHERE STADIUM_ID = ?';
      const binds = stadiumId === null ? [] : [stadiumId];
      // Aggregate individual review rows across all matches, never match averages.
      const summary = await query(`
        SELECT COUNT(*) AS REVIEW_COUNT, COUNT(DISTINCT GAME_ID) AS MATCH_COUNT,
          ROUND(AVG(OVERALL_SCORE), 2) AS AVG_OVERALL,
          ROUND(AVG(SECURITY_SCORE), 2) AS AVG_SECURITY
        FROM READ_READY.REVIEWS_FACT ${where}
      `, binds);
      const sections = await query(`
        SELECT SECTION, COUNT(*) AS REVIEW_COUNT,
          ROUND(AVG(OVERALL_SCORE), 2) AS AVG_OVERALL,
          ROUND(AVG(SECURITY_SCORE), 2) AS AVG_SECURITY
        FROM READ_READY.REVIEWS_FACT ${where}
        GROUP BY SECTION ORDER BY SECTION
      `, binds);
      res.json({ stadium_id: stadiumId, stadiums, sections, summary: summary[0] || {} });
    } catch (error) {
      console.error('Stadium section analytics failed', { code: error.code });
      res.status(500).json({ message: 'Unable to load stadium statistics. Please try again.' });
    }
  });
  return router;
}
