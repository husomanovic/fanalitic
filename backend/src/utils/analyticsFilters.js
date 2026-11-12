export const metrics = Object.freeze({
  overall: 'OVERALL_SCORE', security: 'SECURITY_SCORE',
  organization: 'ORGANIZATION_SCORE', family_friendly: 'FAMILY_FRIENDLY_SCORE',
  experience: 'EXPERIENCE_SCORE', comfort: 'COMFORT_SCORE', game: 'GAME_SCORE'
});

export function parseAnalyticsFilters(input = {}) {
  const allowed = new Set(['gameId', 'stadiumId', 'section', 'team', 'city', 'dateFrom', 'dateTo',
    'minScore', 'maxScore', 'metric', 'interval', 'limit', 'offset', 'minReviews']);
  const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) fail(`Unknown filter: ${key}`);
    if (typeof value !== 'string' || !value.trim()) fail(`Invalid ${key}`);
  }
  const integer = (name, fallback, min, max) => {
    if (input[name] === undefined) return fallback;
    if (!/^\d+$/.test(input[name])) fail(`${name} must be an integer`);
    const value = Number(input[name]);
    if (!Number.isSafeInteger(value) || value < min || value > max) fail(`Invalid ${name}`);
    return value;
  };
  const result = {
    metric: input.metric ?? 'overall', interval: input.interval ?? 'day',
    limit: integer('limit', 100, 1, 500), offset: integer('offset', 0, 0, 1000000),
    minReviews: integer('minReviews', 1, 1, Number.MAX_SAFE_INTEGER),
    gameId: integer('gameId', undefined, 1, Number.MAX_SAFE_INTEGER),
    stadiumId: integer('stadiumId', undefined, 1, Number.MAX_SAFE_INTEGER),
    minScore: integer('minScore', undefined, 1, 5), maxScore: integer('maxScore', undefined, 1, 5)
  };
  if (!Object.hasOwn(metrics, result.metric)) fail('Invalid metric');
  if (!['day', 'week', 'month'].includes(result.interval)) fail('Invalid interval');
  for (const key of ['section', 'team', 'city']) {
    if (input[key]?.length > 255) fail(`${key} is too long`);
    result[key] = input[key];
  }
  for (const key of ['dateFrom', 'dateTo']) {
    const value = input[key];
    if (value !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) fail(`Invalid ${key}; use YYYY-MM-DD`);
    result[key] = value;
  }
  if (result.dateFrom && result.dateTo && result.dateFrom > result.dateTo) fail('dateFrom must not exceed dateTo');
  if (result.minScore && result.maxScore && result.minScore > result.maxScore) fail('minScore must not exceed maxScore');
  return result;
}
