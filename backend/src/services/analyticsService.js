import { buildAnalyticsQuery } from '../repositories/analyticsRepository.js';
import { parseAnalyticsFilters } from '../utils/analyticsFilters.js';

export async function getAnalytics(endpoint, input, query) {
  const filters = parseAnalyticsFilters(input);
  const { sqlText, binds, paginated } = buildAnalyticsQuery(endpoint, filters);
  const rows = await query(sqlText, binds);
  return {
    data: paginated ? rows.slice(0, filters.limit) : rows,
    meta: {
      source: 'READ_READY.REVIEWS_FACT', metric: filters.metric, filters,
      ...(paginated ? { limit: filters.limit, offset: filters.offset, hasMore: rows.length > filters.limit } : {})
    }
  };
}
