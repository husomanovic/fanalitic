'use client';

import { useEffect, useState } from 'react';
import { fetchAnalytics, metricLabels, number } from '@/utils/analytics';
import DashboardFilters, { initialFilters } from './DashboardFilters';
import ChartCard from './ChartCard';
import { RatingBars, RatingPie, RatingTrend } from './AnalyticsCharts';
import styles from './Dashboard.module.css';

const endpoints = ['summary', 'categories', 'distribution', 'trends', 'stadiums', 'games', 'teams', 'sections'];
const paginated = new Set(['trends', 'stadiums', 'games', 'teams', 'sections']);

export default function AnalyticsDashboard() {
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(initialFilters);
  const [refresh, setRefresh] = useState(0);
  const [states, setStates] = useState({});
  const [options, setOptions] = useState([]);
  const [optionsError, setOptionsError] = useState('');
  const [page, setPage] = useState(0);
  const [reviews, setReviews] = useState({ loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setOptionsError('');
    fetchAnalytics('filter-options', {}, controller.signal, true).then(result => setOptions(result.data)).catch(error => {
      if (!controller.signal.aborted) setOptionsError(error.message);
    });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    setStates(Object.fromEntries(endpoints.map(key => [key, { loading: true }])));
    for (const endpoint of endpoints) {
      fetchAnalytics(endpoint, filters, controller.signal, paginated.has(endpoint)).then(result => {
        if (!controller.signal.aborted) setStates(prev => ({ ...prev, [endpoint]: result }));
      }).catch(error => {
        if (!controller.signal.aborted) setStates(prev => ({ ...prev, [endpoint]: { error: error.message } }));
      });
    }
    return () => controller.abort();
  }, [filters, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    setReviews({ loading: true });
    fetchAnalytics('reviews', { ...filters, limit: 10, offset: page * 10 }, controller.signal).then(result => {
      if (!controller.signal.aborted) setReviews(result);
    }).catch(error => { if (!controller.signal.aborted) setReviews({ error: error.message }); });
    return () => controller.abort();
  }, [filters, page, refresh]);

  const rows = key => states[key]?.data || [];
  const summary = rows('summary')[0];
  const loading = endpoints.some(key => !states[key] || states[key].loading);
  const metric = metricLabels[filters.metric];
  const categories = rows('categories').map(r => ({ ...r, label: metricLabels[r.METRIC] || r.METRIC }));
  const distribution = rows('distribution').map(r => ({ ...r, REVIEW_COUNT: Number(r.REVIEW_COUNT), label: `${r.SCORE} stars` }));
  const comparison = (key, label) => rows(key).map(r => ({ ...r, label: label(r) })).sort((a,b) => Number(b.REVIEW_COUNT) - Number(a.REVIEW_COUNT)).slice(0, 10);
  function apply(event) { event.preventDefault(); setPage(0); setFilters({ ...draft }); }
  function reset() { setDraft(initialFilters); setFilters({ ...initialFilters }); setPage(0); }

  return <div className={styles.dashboard} id="dashboard">
    <header className={styles.header}><div><p className={styles.eyebrow}>MATCHDAY INTELLIGENCE <span>Demo data</span></p><h1>Every fan. Every experience.</h1><p>Explore what makes a great day at the stadium.</p></div>
      <button className={styles.refresh} onClick={() => setRefresh(value => value + 1)} disabled={loading}>↻ Refresh data</button></header>
    <DashboardFilters draft={draft} setDraft={setDraft} options={options} onApply={apply} onReset={reset} loading={loading} />
    {optionsError && <p className={styles.error} role="alert">Filter options: {optionsError} Use Refresh data to retry.</p>}
    <p className={styles.context} aria-live="polite">Showing {metric.toLowerCase()} ratings · {filters.dateFrom || 'All dates'}{filters.dateTo ? ` through ${filters.dateTo}` : ''} · Filters update every chart when applied.</p>
    <ChartCard title="Matchday at a glance" subtitle="Review-weighted scores from the current selection" state={states.summary || { loading: true }}>
      <div className={styles.kpis}>{[
        ['Reviews received', number(summary?.REVIEW_COUNT), 'Fan responses'],
        [`${metric} rating`, `${number(summary?.AVG_SCORE)} / 5`, 'Average valid rating'],
        ['Satisfied fans', summary?.SATISFACTION_PCT == null ? '—' : `${number(summary.SATISFACTION_PCT)}%`, 'Rated 4 or 5 stars'],
        ['Games covered', number(summary?.GAME_COUNT), `${number(summary?.STADIUM_COUNT)} stadiums`]
      ].map(([label, value, detail]) => <div key={label}><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>)}</div>
    </ChartCard>
    <div className={styles.grid}>
      <ChartCard id="experience" title="The fan experience" subtitle="Average score across all seven categories" state={states.categories} empty={!categories.some(r => r.AVG_SCORE != null)}><RatingBars data={categories} /></ChartCard>
      <ChartCard title="How fans rated it" subtitle={`${metric} · share of 1–5 star responses`} state={states.distribution} empty={!distribution.some(r => r.REVIEW_COUNT > 0)}><RatingPie data={distribution} /></ChartCard>
      <ChartCard title="Experience over time" subtitle={`${metric} · by game ${filters.interval}; dates with no reviews are omitted`} state={states.trends} empty={!rows('trends').length}><RatingTrend data={rows('trends').map(r => ({ ...r, label: String(r.PERIOD).slice(0, 10) }))} /></ChartCard>
      <ChartCard title="Rating distribution" subtitle={`${metric} · number of reviews at each score`} state={states.distribution} empty={!distribution.some(r => r.REVIEW_COUNT > 0)}><RatingBars data={distribution} value="REVIEW_COUNT" count /></ChartCard>
      {[
        ['stadiums', 'Stadium comparison', r => r.STADIUM_NAME],
        ['games', 'Match comparison', r => `${r.HOME_TEAM} vs ${r.AWAY_TEAM}`],
        ['teams', 'Around the clubs', r => r.TEAM],
        ['sections', 'Inside the stands', r => `${r.STADIUM_NAME} · ${r.SECTION || 'Unknown'}`]
      ].map(([key, title, label]) => <ChartCard key={key} id={key} title={title} subtitle={`${metric} · up to 10 groups with the most reviews${key === 'teams' ? '; each review counts for both teams' : ''}`} state={states[key]} empty={!rows(key).length}><RatingBars data={comparison(key, label)} /></ChartCard>)}
    </div>
    <ChartCard id="reviews" title="Voices from the stands" subtitle="Individual reviews · newest ingested first" state={reviews} empty={!reviews.data?.length}>
      <div className={styles.tableWrap}><table><thead><tr><th>Game</th><th>Stadium / section</th><th>{metric}</th><th>Fan feedback</th></tr></thead><tbody>
        {reviews.data?.map((row, index) => <tr key={`${page}-${index}`}><td>{row.HOME_TEAM} vs {row.AWAY_TEAM}<small>{String(row.GAME_DATE).slice(0, 10)}</small></td><td>{row.STADIUM_NAME}<small>Section {row.SECTION || 'Unknown'}</small></td><td><span className={styles.score}>{number(row[`${filters.metric.toUpperCase()}_SCORE`])} / 5</span></td><td className={styles.feedback}>{row.FEEDBACK_TEXT || 'No written feedback'}</td></tr>)}
      </tbody></table></div>
    </ChartCard>
    <div className={styles.pagination}><button disabled={page === 0 || reviews.loading} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={!reviews.meta?.hasMore || reviews.loading} onClick={() => setPage(value => value + 1)}>Next</button></div>
    <p className={styles.context}>Latest review ingestion: {summary?.LATEST_INGESTED_AT ? String(summary.LATEST_INGESTED_AT) : 'Not available'}. New reviews appear after the Snowflake pipeline processes them.</p>
  </div>;
}
