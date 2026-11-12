import { metrics } from '../utils/analyticsFilters.js';

const averages = Object.entries(metrics).map(([key, col]) => `ROUND(AVG(${col}), 2) AS AVG_${key.toUpperCase()}`).join(', ');
const counts = 'COUNT(*) AS REVIEW_COUNT, COUNT(DISTINCT TICKET_ID) AS REVIEWED_TICKETS';
const dimensions = {
  games: 'GAME_ID, HOME_TEAM, AWAY_TEAM, GAME_DATE',
  stadiums: 'STADIUM_ID, STADIUM_NAME, STADIUM_CITY',
  sections: 'STADIUM_ID, STADIUM_NAME, SECTION',
  cities: 'STADIUM_CITY',
  'seat-heatmap': 'GAME_ID, STADIUM_ID, SECTION, ROW_NUMBER',
};

export const analyticsEndpoints = [
  'summary', 'games', 'stadiums', 'sections', 'cities', 'teams', 'categories',
  'distribution', 'trends', 'rating-matrix', 'seat-heatmap', 'reviews', 'feedback',
  'low-scores', 'correlations', 'filter-options', 'freshness'
];

export function buildAnalyticsQuery(endpoint, f) {
  const clauses = [];
  const binds = [];
  const add = (sql, ...values) => { clauses.push(sql); binds.push(...values); };
  for (const [key, col] of Object.entries({gameId: 'GAME_ID', stadiumId: 'STADIUM_ID', section: 'SECTION', city: 'STADIUM_CITY'})) {
    if (f[key] !== undefined) add(`${col} = ?`, f[key]);
  }
  if (f.team !== undefined) add('(HOME_TEAM = ? OR AWAY_TEAM = ?)', f.team, f.team);
  if (f.dateFrom) add('GAME_DATE >= TO_DATE(?)', f.dateFrom);
  if (f.dateTo) add('GAME_DATE < DATEADD(day, 1, TO_DATE(?))', f.dateTo);
  const score = metrics[f.metric];
  if (f.minScore !== undefined) add(`${score} >= ?`, f.minScore);
  if (f.maxScore !== undefined) add(`${score} <= ?`, f.maxScore);
  const cte = `WITH filtered AS (SELECT * FROM READ_READY.REVIEWS_FACT ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''})`;
  const validScore = `${score} BETWEEN 1 AND 5`;
  const metricSummary = `COUNT(CASE WHEN ${validScore} THEN 1 END) AS RATED_COUNT,
    ROUND(AVG(CASE WHEN ${validScore} THEN ${score} END), 2) AS AVG_SCORE,
    COUNT(CASE WHEN ${score} BETWEEN 1 AND 2 THEN 1 END) AS LOW_SCORE_COUNT,
    ROUND(100.0 * COUNT(CASE WHEN ${score} BETWEEN 4 AND 5 THEN 1 END) /
      NULLIF(COUNT(CASE WHEN ${validScore} THEN 1 END), 0), 2) AS SATISFACTION_PCT`;
  let sql;
  let extraCte = '';
  let paginated = true;
  if (Object.hasOwn(dimensions, endpoint)) {
    const group = dimensions[endpoint];
    sql = `SELECT ${group}, ${counts}, ${averages}, ${metricSummary} FROM filtered
      GROUP BY ${group} HAVING COUNT(*) >= ? ORDER BY ${endpoint === 'games' ? 'GAME_DATE DESC, GAME_ID' : group}`;
    binds.push(f.minReviews);
  } else switch (endpoint) {
    case 'summary':
      sql = `SELECT ${counts}, COUNT(DISTINCT GAME_ID) AS GAME_COUNT,
        COUNT(DISTINCT STADIUM_ID) AS STADIUM_COUNT, ${averages}, ${metricSummary},
        MAX(INGESTED_AT) AS LATEST_INGESTED_AT FROM filtered`;
      paginated = false; break;
    case 'teams':
      extraCte = ', team_reviews AS (SELECT *, HOME_TEAM AS TEAM FROM filtered UNION ALL SELECT *, AWAY_TEAM AS TEAM FROM filtered WHERE AWAY_TEAM <> HOME_TEAM)';
      sql = `SELECT TEAM, ${counts}, ${averages}, ${metricSummary} FROM team_reviews
        GROUP BY TEAM HAVING COUNT(*) >= ? ORDER BY AVG_SCORE DESC NULLS LAST, TEAM`;
      binds.push(f.minReviews); break;
    case 'categories':
      sql = Object.entries(metrics).map(([key, col]) => `SELECT '${key}' AS METRIC,
        COUNT(CASE WHEN ${col} BETWEEN 1 AND 5 THEN 1 END) AS RATED_COUNT,
        ROUND(AVG(CASE WHEN ${col} BETWEEN 1 AND 5 THEN ${col} END), 2) AS AVG_SCORE,
        COUNT(CASE WHEN ${col} BETWEEN 1 AND 2 THEN 1 END) AS LOW_SCORE_COUNT,
        COUNT(CASE WHEN ${col} BETWEEN 4 AND 5 THEN 1 END) AS HIGH_SCORE_COUNT FROM filtered`).join(' UNION ALL ') + ' ORDER BY METRIC';
      paginated = false; break;
    case 'distribution':
      extraCte = ', scores AS (SELECT column1 AS SCORE FROM VALUES (1), (2), (3), (4), (5))';
      sql = `SELECT s.SCORE, COUNT(f.${score}) AS REVIEW_COUNT,
        ROUND(100.0 * COUNT(f.${score}) / NULLIF(SUM(COUNT(f.${score})) OVER (), 0), 2) AS PERCENTAGE
        FROM scores s LEFT JOIN filtered f ON f.${score} = s.SCORE GROUP BY s.SCORE ORDER BY s.SCORE`;
      paginated = false; break;
    case 'trends':
      sql = `SELECT DATE_TRUNC('${f.interval}', GAME_DATE) AS PERIOD, ${counts}, ${averages}, ${metricSummary}
        FROM filtered GROUP BY PERIOD HAVING COUNT(*) >= ? ORDER BY PERIOD`;
      binds.push(f.minReviews); break;
    case 'rating-matrix':
      sql = `SELECT OVERALL_SCORE, ${score} AS SCORE, COUNT(*) AS REVIEW_COUNT FROM filtered
        WHERE OVERALL_SCORE BETWEEN 1 AND 5 AND ${validScore}
        GROUP BY OVERALL_SCORE, ${score} ORDER BY OVERALL_SCORE, SCORE`;
      paginated = false; break;
    case 'reviews': case 'feedback': case 'low-scores':
      sql = `SELECT GAME_ID, HOME_TEAM, AWAY_TEAM, GAME_DATE, STADIUM_ID, STADIUM_NAME,
        SECTION, ${Object.values(metrics).join(', ')}, FEEDBACK_TEXT, INGESTED_AT FROM filtered
        ${endpoint === 'feedback' ? "WHERE NULLIF(TRIM(FEEDBACK_TEXT), '') IS NOT NULL" : endpoint === 'low-scores' ? `WHERE ${score} BETWEEN 1 AND 2` : ''}
        ORDER BY INGESTED_AT DESC NULLS LAST, GAME_ID, TICKET_ID`;
      break;
    case 'correlations':
      sql = Object.entries(metrics).map(([key, col]) => `SELECT '${key}' AS METRIC,
        COUNT(*) AS PAIRED_COUNT, CORR(OVERALL_SCORE, ${col}) AS CORRELATION
        FROM filtered WHERE OVERALL_SCORE BETWEEN 1 AND 5 AND ${col} BETWEEN 1 AND 5`).join(' UNION ALL ') + ' ORDER BY METRIC';
      paginated = false; break;
    case 'filter-options':
      sql = `SELECT DISTINCT GAME_ID, HOME_TEAM, AWAY_TEAM, GAME_DATE, STADIUM_ID,
        STADIUM_NAME, STADIUM_CITY, SECTION FROM filtered ORDER BY GAME_DATE DESC, GAME_ID, STADIUM_ID, SECTION`;
      break;
    case 'freshness':
      sql = `SELECT COUNT(*) AS REVIEW_COUNT, COUNT(DISTINCT TICKET_ID) AS REVIEWED_TICKETS,
        COUNT(*) - COUNT(DISTINCT TICKET_ID) AS EXTRA_OR_NULL_TICKET_ROWS,
        MIN(INGESTED_AT) AS EARLIEST_INGESTED_AT, MAX(INGESTED_AT) AS LATEST_INGESTED_AT,
        (SELECT MAX(LAST_REFRESHED) FROM READ_READY.GAME_METRICS) AS METRICS_LAST_REFRESHED FROM filtered`;
      paginated = false; break;
    default: throw new Error('Unknown analytics endpoint');
  }
  // One extra row allows accurate hasMore without a second, potentially inconsistent count query.
  if (paginated) { sql += ' LIMIT ? OFFSET ?'; binds.push(f.limit + 1, f.offset); }
  return { sqlText: `${cte}${extraCte} ${sql}`, binds, paginated };
}
