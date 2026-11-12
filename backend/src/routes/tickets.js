import express from 'express';
import { query } from '../config/snowflake.js';

const router = express.Router();

router.get('/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;

    const rows = await query(`
      SELECT
        T.ID AS TICKET_ID,
        T.BARCODE,
        T.SECTION,
        T.ROW_NUMBER,
        T.SEAT_NUMBER,
        G.ID AS GAME_ID,
        G.GAME_DATE,
        H.NAME AS HOME_TEAM,
        A.NAME AS AWAY_TEAM,
        S.NAME AS STADIUM
      FROM PUBLIC_APP.TICKETS T
      JOIN PUBLIC_APP.GAMES G
        ON T.GAME_ID = G.ID
      JOIN PUBLIC_APP.TEAMS H
        ON G.HOME_TEAM_ID = H.ID
      JOIN PUBLIC_APP.TEAMS A
        ON G.GUEST_TEAM_ID = A.ID
      JOIN PUBLIC_APP.STADIUMS S
        ON G.STADIUM_ID = S.ID
      WHERE T.BARCODE = ?
      LIMIT 1
    `, [barcode]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }

    const ticket = rows[0];

    const factUsed = await query(`
      SELECT 1 AS FLAG
      FROM READ_READY.REVIEWS_FACT
      WHERE TICKET_CODE = ?
      LIMIT 1
    `, [barcode]);

    let reviewUsed = factUsed.length > 0;

    if (!reviewUsed) {
      const seededUsed = await query(`
        SELECT 1 AS FLAG
        FROM PUBLIC_APP.REVIEWS
        WHERE TICKET_ID = ?
        LIMIT 1
      `, [ticket.TICKET_ID]);
      reviewUsed = seededUsed.length > 0;
    }

    return res.json({
      ...ticket,
      review_used: reviewUsed
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch ticket'
    });
  }
});

export default router;
