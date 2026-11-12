// Match metadata comes from warehouse reference tables, never from browser fields.
export async function insertReviewFact(review, ticketCode, query) {
  const result = await query(`
    INSERT INTO READ_READY.REVIEWS_FACT (
      TICKET_ID, TICKET_CODE, GAME_ID, GAME_DATE, HOME_TEAM, AWAY_TEAM,
      STADIUM_ID, STADIUM_NAME, STADIUM_CITY, SECTION, ROW_NUMBER, SEAT_NUMBER,
      OVERALL_SCORE, SECURITY_SCORE, ORGANIZATION_SCORE, FAMILY_FRIENDLY_SCORE,
      EXPERIENCE_SCORE, COMFORT_SCORE, GAME_SCORE, FEEDBACK_TEXT, INGESTED_AT
    )
    SELECT T.ID, T.BARCODE, G.ID, G.GAME_DATE, H.NAME, A.NAME,
           S.ID, S.NAME, S.CITY, T.SECTION, T.ROW_NUMBER, T.SEAT_NUMBER,
           ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP()::TIMESTAMP_NTZ
    FROM PUBLIC_APP.TICKETS T
    JOIN PUBLIC_APP.GAMES G ON G.ID = T.GAME_ID
    JOIN PUBLIC_APP.TEAMS H ON H.ID = G.HOME_TEAM_ID
    JOIN PUBLIC_APP.TEAMS A ON A.ID = G.GUEST_TEAM_ID
    JOIN PUBLIC_APP.STADIUMS S ON S.ID = G.STADIUM_ID
    WHERE T.BARCODE = ?
    LIMIT 1
  `, [review.overall_score, review.security_score, review.organization_score,
    review.family_friendly_score, review.experience_score, review.comfort_score,
    review.game_score, review.feedback_text || '', ticketCode]);

  // Snowflake returns this DML result column for INSERT statements.
  const inserted = result[0]?.['number of rows inserted'];
  if (Number(inserted) !== 1) {
    throw new Error('Review insert did not confirm one saved row');
  }
}
