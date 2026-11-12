import express from 'express';
import { query } from '../config/snowflake.js';

const router = express.Router();

function requiredText(value, max) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > max) return null;
  return text;
}

function optionalUrl(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  if (!/^https?:\/\/\S+$/i.test(text) || text.length > 500) return null;
  return text;
}

function positiveInt(value, max) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > max) return null;
  return number;
}

function routeId(value) {
  return positiveInt(value, Number.MAX_SAFE_INTEGER);
}

function gameTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return `${value.replace('T', ' ')}:00`;
}

async function nextId(table) {
  const rows = await query(`SELECT COALESCE(MAX(ID), 0) + 1 AS NEXT_ID FROM ${table}`);
  const raw = rows[0]?.NEXT_ID ?? rows[0]?.next_id;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Could not assign an id for ${table}`);
  }
  return id;
}

router.get('/teams', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        T.ID,
        T.NAME,
        T.LOGO_URL,
        COUNT(G.GAME_ID) AS MATCHES,
        ROUND(AVG(G.AVG_OVERALL), 2) AS AVG_OVERALL,
        ROUND(AVG(G.AVG_SECURITY), 2) AS AVG_SECURITY
      FROM PUBLIC_APP.TEAMS T
      LEFT JOIN READ_READY.GAME_METRICS G
        ON G.HOME_TEAM = T.NAME
        OR G.AWAY_TEAM = T.NAME
      GROUP BY T.ID, T.NAME, T.LOGO_URL
      ORDER BY T.NAME
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch teams'
    });
  }
});

router.get('/stadiums', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        S.ID,
        S.NAME,
        S.CITY,
        S.COUNTRY,
        S.CAPACITY,
        COUNT(R.TICKET_ID) AS REVIEW_COUNT,
        ROUND(AVG(R.OVERALL_SCORE), 2) AS AVG_OVERALL,
        ROUND(AVG(R.SECURITY_SCORE), 2) AS AVG_SECURITY,
        ROUND(AVG(R.COMFORT_SCORE), 2) AS AVG_COMFORT
      FROM PUBLIC_APP.STADIUMS S
      LEFT JOIN READ_READY.REVIEWS_FACT R
        ON R.STADIUM_ID = S.ID
      GROUP BY S.ID, S.NAME, S.CITY, S.COUNTRY, S.CAPACITY
      ORDER BY S.NAME
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch stadiums'
    });
  }
});

router.get('/games', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        G.ID,
        G.GAME_DATE,
        G.SCORE_HOME,
        G.SCORE_GUEST,
        H.ID AS HOME_TEAM_ID,
        A.ID AS GUEST_TEAM_ID,
        S.ID AS STADIUM_ID,
        H.NAME AS HOME_TEAM,
        A.NAME AS AWAY_TEAM,
        S.NAME AS STADIUM,
        S.CITY,
        M.REVIEW_COUNT,
        ROUND(M.AVG_OVERALL, 2) AS AVG_OVERALL,
        ROUND(M.AVG_SECURITY, 2) AS AVG_SECURITY
      FROM PUBLIC_APP.GAMES G
      JOIN PUBLIC_APP.TEAMS H ON H.ID = G.HOME_TEAM_ID
      JOIN PUBLIC_APP.TEAMS A ON A.ID = G.GUEST_TEAM_ID
      JOIN PUBLIC_APP.STADIUMS S ON S.ID = G.STADIUM_ID
      LEFT JOIN READ_READY.GAME_METRICS M ON M.GAME_ID = G.ID
      ORDER BY G.GAME_DATE DESC
      LIMIT 80
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch games'
    });
  }
});

router.post('/teams', async (req, res) => {
  try {
    const name = requiredText(req.body?.name, 80);
    const logoUrl = optionalUrl(req.body?.logoUrl);

    if (!name) {
      return res.status(400).json({ message: 'A team name is required' });
    }

    if (req.body?.logoUrl && !logoUrl) {
      return res.status(400).json({ message: 'Logo must be an http or https URL' });
    }

    const existing = await query(
      `SELECT ID FROM PUBLIC_APP.TEAMS WHERE UPPER(NAME) = UPPER(?) LIMIT 1`,
      [name]
    );

    if (existing.length) {
      return res.status(409).json({ message: 'A team with that name already exists' });
    }

    const id = await nextId('PUBLIC_APP.TEAMS');
    await query(
      `INSERT INTO PUBLIC_APP.TEAMS (ID, NAME, LOGO_URL) VALUES (?, ?, ?)`,
      [id, name, logoUrl]
    );

    res.status(201).json({ id, name, logoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create team' });
  }
});

router.put('/teams/:id', async (req, res) => {
  try {
    const id = routeId(req.params.id);
    const name = requiredText(req.body?.name, 80);
    const logoUrl = optionalUrl(req.body?.logoUrl);

    if (!id || !name) {
      return res.status(400).json({ message: 'A team name is required' });
    }

    if (req.body?.logoUrl && !logoUrl) {
      return res.status(400).json({ message: 'Logo must be an http or https URL' });
    }

    const current = await query(`SELECT ID FROM PUBLIC_APP.TEAMS WHERE ID = ?`, [id]);
    if (!current.length) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const existing = await query(
      `SELECT ID FROM PUBLIC_APP.TEAMS WHERE UPPER(NAME) = UPPER(?) AND ID <> ? LIMIT 1`,
      [name, id]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'A team with that name already exists' });
    }

    await query(
      `UPDATE PUBLIC_APP.TEAMS SET NAME = ?, LOGO_URL = ? WHERE ID = ?`,
      [name, logoUrl, id]
    );

    res.json({ id, name, logoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update team' });
  }
});

router.delete('/teams/:id', async (req, res) => {
  try {
    const id = routeId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid team' });
    }

    const current = await query(`SELECT ID FROM PUBLIC_APP.TEAMS WHERE ID = ?`, [id]);
    if (!current.length) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const used = await query(
      `SELECT COUNT(*) AS USED FROM PUBLIC_APP.GAMES WHERE HOME_TEAM_ID = ? OR GUEST_TEAM_ID = ?`,
      [id, id]
    );
    const count = Number(used[0]?.USED ?? used[0]?.used ?? 0);
    if (count > 0) {
      return res.status(409).json({
        message: 'Delete this club’s matches before deleting the club'
      });
    }

    await query(`DELETE FROM PUBLIC_APP.TEAMS WHERE ID = ?`, [id]);
    res.json({ id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete team' });
  }
});

router.post('/stadiums', async (req, res) => {
  try {
    const name = requiredText(req.body?.name, 80);
    const city = requiredText(req.body?.city, 80);
    const country = requiredText(req.body?.country, 80);
    const capacity = positiveInt(req.body?.capacity, 200000);

    if (!name || !city || !country || !capacity) {
      return res.status(400).json({
        message: 'Name, city, country, and a capacity up to 200000 are required'
      });
    }

    const existing = await query(
      `SELECT ID FROM PUBLIC_APP.STADIUMS WHERE UPPER(NAME) = UPPER(?) AND UPPER(CITY) = UPPER(?) LIMIT 1`,
      [name, city]
    );

    if (existing.length) {
      return res.status(409).json({ message: 'That stadium already exists in this city' });
    }

    const id = await nextId('PUBLIC_APP.STADIUMS');
    await query(
      `INSERT INTO PUBLIC_APP.STADIUMS (ID, NAME, CITY, COUNTRY, CAPACITY) VALUES (?, ?, ?, ?, ?)`,
      [id, name, city, country, capacity]
    );

    res.status(201).json({ id, name, city, country, capacity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create stadium' });
  }
});

router.put('/stadiums/:id', async (req, res) => {
  try {
    const id = routeId(req.params.id);
    const name = requiredText(req.body?.name, 80);
    const city = requiredText(req.body?.city, 80);
    const country = requiredText(req.body?.country, 80);
    const capacity = positiveInt(req.body?.capacity, 200000);

    if (!id || !name || !city || !country || !capacity) {
      return res.status(400).json({
        message: 'Name, city, country, and a capacity up to 200000 are required'
      });
    }

    const current = await query(`SELECT ID FROM PUBLIC_APP.STADIUMS WHERE ID = ?`, [id]);
    if (!current.length) {
      return res.status(404).json({ message: 'Stadium not found' });
    }

    const existing = await query(
      `SELECT ID FROM PUBLIC_APP.STADIUMS WHERE UPPER(NAME) = UPPER(?) AND UPPER(CITY) = UPPER(?) AND ID <> ? LIMIT 1`,
      [name, city, id]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'That stadium already exists in this city' });
    }

    await query(
      `UPDATE PUBLIC_APP.STADIUMS SET NAME = ?, CITY = ?, COUNTRY = ?, CAPACITY = ? WHERE ID = ?`,
      [name, city, country, capacity, id]
    );

    res.json({ id, name, city, country, capacity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update stadium' });
  }
});

router.delete('/stadiums/:id', async (req, res) => {
  try {
    const id = routeId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid stadium' });
    }

    const current = await query(`SELECT ID FROM PUBLIC_APP.STADIUMS WHERE ID = ?`, [id]);
    if (!current.length) {
      return res.status(404).json({ message: 'Stadium not found' });
    }

    const used = await query(
      `SELECT COUNT(*) AS USED FROM PUBLIC_APP.GAMES WHERE STADIUM_ID = ?`,
      [id]
    );
    const count = Number(used[0]?.USED ?? used[0]?.used ?? 0);
    if (count > 0) {
      return res.status(409).json({
        message: 'Delete the matches at this stadium before deleting it'
      });
    }

    await query(`DELETE FROM PUBLIC_APP.STADIUMS WHERE ID = ?`, [id]);
    res.json({ id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete stadium' });
  }
});

router.post('/games', async (req, res) => {
  try {
    const homeTeamId = positiveInt(req.body?.homeTeamId, Number.MAX_SAFE_INTEGER);
    const guestTeamId = positiveInt(req.body?.guestTeamId, Number.MAX_SAFE_INTEGER);
    const stadiumId = positiveInt(req.body?.stadiumId, Number.MAX_SAFE_INTEGER);
    const gameDate = gameTimestamp(req.body?.gameDate);

    if (!homeTeamId || !guestTeamId || !stadiumId || !gameDate) {
      return res.status(400).json({
        message: 'Home team, away team, stadium, and kickoff time are required'
      });
    }

    if (homeTeamId === guestTeamId) {
      return res.status(400).json({ message: 'Home and away teams must be different' });
    }

    const teams = await query(
      `SELECT ID FROM PUBLIC_APP.TEAMS WHERE ID IN (?, ?)`,
      [homeTeamId, guestTeamId]
    );
    const stadiums = await query(
      `SELECT ID FROM PUBLIC_APP.STADIUMS WHERE ID = ?`,
      [stadiumId]
    );

    if (teams.length < 2 || !stadiums.length) {
      return res.status(400).json({ message: 'Choose teams and a stadium from the catalog' });
    }

    const id = await nextId('PUBLIC_APP.GAMES');
    await query(
      `INSERT INTO PUBLIC_APP.GAMES
        (ID, HOME_TEAM_ID, GUEST_TEAM_ID, STADIUM_ID, GAME_DATE, SCORE_HOME, SCORE_GUEST)
       SELECT ?, ?, ?, ?, TO_TIMESTAMP_NTZ(?), NULL, NULL`,
      [id, homeTeamId, guestTeamId, stadiumId, gameDate]
    );

    res.status(201).json({ id, homeTeamId, guestTeamId, stadiumId, gameDate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create game' });
  }
});

router.put('/games/:id', async (req, res) => {
  try {
    const id = routeId(req.params.id);
    const homeTeamId = positiveInt(req.body?.homeTeamId, Number.MAX_SAFE_INTEGER);
    const guestTeamId = positiveInt(req.body?.guestTeamId, Number.MAX_SAFE_INTEGER);
    const stadiumId = positiveInt(req.body?.stadiumId, Number.MAX_SAFE_INTEGER);
    const gameDate = gameTimestamp(req.body?.gameDate);

    if (!id || !homeTeamId || !guestTeamId || !stadiumId || !gameDate) {
      return res.status(400).json({
        message: 'Home team, away team, stadium, and kickoff time are required'
      });
    }

    if (homeTeamId === guestTeamId) {
      return res.status(400).json({ message: 'Home and away teams must be different' });
    }

    const current = await query(`SELECT ID FROM PUBLIC_APP.GAMES WHERE ID = ?`, [id]);
    if (!current.length) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const teams = await query(
      `SELECT ID FROM PUBLIC_APP.TEAMS WHERE ID IN (?, ?)`,
      [homeTeamId, guestTeamId]
    );
    const stadiums = await query(
      `SELECT ID FROM PUBLIC_APP.STADIUMS WHERE ID = ?`,
      [stadiumId]
    );

    if (teams.length < 2 || !stadiums.length) {
      return res.status(400).json({ message: 'Choose teams and a stadium from the catalog' });
    }

    await query(
      `UPDATE PUBLIC_APP.GAMES
       SET HOME_TEAM_ID = ?, GUEST_TEAM_ID = ?, STADIUM_ID = ?, GAME_DATE = TO_TIMESTAMP_NTZ(?)
       WHERE ID = ?`,
      [homeTeamId, guestTeamId, stadiumId, gameDate, id]
    );

    res.json({ id, homeTeamId, guestTeamId, stadiumId, gameDate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update game' });
  }
});

router.delete('/games/:id', async (req, res) => {
  try {
    const id = routeId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid match' });
    }

    const current = await query(`SELECT ID FROM PUBLIC_APP.GAMES WHERE ID = ?`, [id]);
    if (!current.length) {
      return res.status(404).json({ message: 'Match not found' });
    }

    await query(
      `DELETE FROM PUBLIC_APP.REVIEWS
       WHERE TICKET_ID IN (SELECT ID FROM PUBLIC_APP.TICKETS WHERE GAME_ID = ?)`,
      [id]
    );
    await query(`DELETE FROM PUBLIC_APP.TICKETS WHERE GAME_ID = ?`, [id]);
    await query(`DELETE FROM READ_READY.REVIEWS_FACT WHERE GAME_ID = ?`, [id]);
    await query(`DELETE FROM READ_READY.GAME_METRICS WHERE GAME_ID = ?`, [id]);
    await query(`DELETE FROM PUBLIC_APP.GAMES WHERE ID = ?`, [id]);

    res.json({ id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete game' });
  }
});

export default router;
