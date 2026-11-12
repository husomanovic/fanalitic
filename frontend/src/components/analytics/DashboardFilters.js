import { metricLabels } from '@/utils/analytics';
import styles from './Dashboard.module.css';

export const initialFilters = { metric: 'overall', interval: 'month', gameId: '', stadiumId: '', section: '', team: '', dateFrom: '', dateTo: '' };

export default function DashboardFilters({ draft, setDraft, options, onApply, onReset, loading }) {
  const change = (key, value) => setDraft(prev => ({ ...prev, [key]: value, ...(['gameId', 'stadiumId'].includes(key) ? { section: '' } : {}) }));
  const unique = (key, label, source = options) => [...new Map(source.filter(r => r[key] != null).map(r => [String(r[key]), { value: r[key], label: label(r) }])).values()];
  const fields = [
    ['metric', 'Rating category', Object.entries(metricLabels).map(([value, label]) => ({ value, label }))],
    ['gameId', 'Game', unique('GAME_ID', r => `${r.HOME_TEAM} vs ${r.AWAY_TEAM} · ${String(r.GAME_DATE).slice(0, 10)}`)],
    ['stadiumId', 'Stadium', unique('STADIUM_ID', r => r.STADIUM_NAME)],
    ['team', 'Team', [...new Set(options.flatMap(r => [r.HOME_TEAM, r.AWAY_TEAM]).filter(Boolean))].sort().map(value => ({ value, label: value }))],
    ['section', 'Section', unique('SECTION', r => r.SECTION, options.filter(r => (!draft.gameId || String(r.GAME_ID) === draft.gameId) && (!draft.stadiumId || String(r.STADIUM_ID) === draft.stadiumId)))],
    ['interval', 'Trend interval', ['day', 'week', 'month'].map(value => ({ value, label: value }))]
  ];
  return <form className={styles.filters} onSubmit={onApply}>
    {fields.map(([key, label, values]) => <label key={key}>{label}<select value={draft[key]} onChange={e => change(key, e.target.value)}>
      {!['metric', 'interval'].includes(key) && <option value="">All {label.toLowerCase()}s</option>}
      {values.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select></label>)}
    <label>From game date<input type="date" value={draft.dateFrom} max={draft.dateTo || undefined} onChange={e => change('dateFrom', e.target.value)} /></label>
    <label>To game date<input type="date" value={draft.dateTo} min={draft.dateFrom || undefined} onChange={e => change('dateTo', e.target.value)} /></label>
    <div className={styles.actions}><button type="submit" disabled={loading}>Apply filters</button><button type="button" className={styles.secondary} onClick={onReset}>Reset</button></div>
  </form>;
}
