export function normalizeTicketCode(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 255) {
    throw Object.assign(new Error('Valid ticket code is required (maximum 255 characters)'), { status: 400 });
  }
  return value.trim();
}

export async function getTicketEligibility(value, query) {
  const barcode = normalizeTicketCode(value);
  const tickets = await query(`
    SELECT T.ID AS TICKET_ID, T.BARCODE, T.SECTION, T.ROW_NUMBER, T.SEAT_NUMBER,
           G.ID AS GAME_ID, G.GAME_DATE, G.SCORE_HOME, G.SCORE_GUEST,
           H.NAME AS HOME_TEAM, A.NAME AS AWAY_TEAM,
           S.NAME AS STADIUM, S.CITY AS STADIUM_CITY
    FROM PUBLIC_APP.TICKETS T
    JOIN PUBLIC_APP.GAMES G ON G.ID = T.GAME_ID
    JOIN PUBLIC_APP.TEAMS H ON H.ID = G.HOME_TEAM_ID
    JOIN PUBLIC_APP.TEAMS A ON A.ID = G.GUEST_TEAM_ID
    JOIN PUBLIC_APP.STADIUMS S ON S.ID = G.STADIUM_ID
    WHERE T.BARCODE = ?
    LIMIT 1
  `, [barcode]);

  if (!tickets.length) return { can_review: false, review_used: false, reason: 'TICKET_NOT_FOUND', ticket: null };
  const ticket = tickets[0];
  // Retain protection for older submissions still in the legacy ingestion pipeline.
  // New web reviews are inserted directly into REVIEWS_FACT.
  const used = await query(`
    SELECT 1 AS FLAG FROM PUBLIC_APP.REVIEWS WHERE TICKET_ID = ?
    UNION ALL
    SELECT 1 AS FLAG FROM READ_READY.REVIEWS_FACT WHERE TICKET_ID = ? OR TICKET_CODE = ?
    UNION ALL
    SELECT 1 AS FLAG FROM INGESTION.REVIEWS_IN WHERE RAW_DATA:ticket_code::STRING = ?
    LIMIT 1
  `, [ticket.TICKET_ID, ticket.TICKET_ID, barcode, barcode]);
  const reviewUsed = used.length > 0;
  return {
    can_review: !reviewUsed,
    review_used: reviewUsed,
    reason: reviewUsed ? 'ALREADY_REVIEWED' : 'AVAILABLE',
    ticket
  };
}
