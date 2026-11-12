'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import styles from './Dashboard.module.css';

const colors = ['#c95664', '#eb9960', '#d6b94c', '#51aaa1', '#237eac'];
const tooltip = { background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--line)', borderRadius: 8 };

export function RatingBars({ data, value = 'AVG_SCORE', count = false }) {
  return <div className={styles.chart}><ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 10, right: 15, bottom: 35, left: 0 }} accessibilityLayer>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
      <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={65} />
      <YAxis domain={count ? [0, 'auto'] : [0, 5]} allowDecimals={!count} tick={{ fill: 'var(--muted)', fontSize: 12 }} width={36} />
      <Tooltip contentStyle={tooltip} /><Bar dataKey={value} name={count ? 'Reviews' : 'Average rating'} fill="#237eac" radius={[5, 5, 0, 0]} maxBarSize={48} isAnimationActive={false} />
    </BarChart>
  </ResponsiveContainer></div>;
}

export function RatingPie({ data }) {
  return <div className={styles.chart}><ResponsiveContainer width="100%" height="100%">
    <PieChart accessibilityLayer><Pie data={data} dataKey="REVIEW_COUNT" nameKey="label" innerRadius="48%" outerRadius="72%" paddingAngle={2} isAnimationActive={false}>
      {data.map((row, i) => <Cell key={row.SCORE} fill={colors[i % colors.length]} />)}
    </Pie><Tooltip contentStyle={tooltip} /><Legend /></PieChart>
  </ResponsiveContainer></div>;
}

export function RatingTrend({ data }) {
  return <div className={styles.chart}><ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 10, right: 15, bottom: 10, left: 0 }} accessibilityLayer>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
      <XAxis dataKey="label" minTickGap={35} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
      <YAxis domain={[1, 5]} width={36} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
      <Tooltip contentStyle={tooltip} /><Line type="linear" dataKey="AVG_SCORE" name="Average rating" stroke="#237eac" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
    </LineChart>
  </ResponsiveContainer></div>;
}
