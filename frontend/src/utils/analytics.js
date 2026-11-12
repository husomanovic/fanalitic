export const metricLabels = { overall: 'Overall', security: 'Security', organization: 'Organization', family_friendly: 'Family friendly', experience: 'Experience', comfort: 'Comfort', game: 'Game' };

export async function fetchAnalytics(endpoint, filters = {}, signal, allPages = false) {
  const rows = [];
  let offset = 0;
  do {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));
    if (allPages) { params.set('limit', '500'); params.set('offset', String(offset)); }
    const response = await fetch(`/api/analytics/${endpoint}?${params}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Analytics unavailable (${response.status}). Check that the backend and Snowflake connection are running.`);
    const body = await response.json();
    const data = Array.isArray(body) ? body : body.data;
    if (!Array.isArray(data)) throw new Error('Unexpected analytics response.');
    rows.push(...data);
    const hasMore = Array.isArray(body) ? data.length === 500 : body.meta?.hasMore;
    if (!allPages || !hasMore) return { data: rows, meta: body.meta };
    offset += 500;
    if (offset > 1000000) throw new Error('Too much data. Narrow the date range.');
  } while (true);
}

export const number = value => value == null ? '—' : new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(value));
