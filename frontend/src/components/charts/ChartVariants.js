"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./Charts.module.css";

export function ScoreChart({ type, data, series, colors, axis, tooltip, xKey = "date", domain = [1, 5] }) {
  const Chart = type === "line" ? LineChart : type === "area" ? AreaChart : BarChart;
  return (
    <ResponsiveContainer>
      <Chart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={24} tickFormatter={value => String(value).slice(0, 18)} />
        <YAxis domain={domain} ticks={[1, 2, 3, 4, 5]} {...axis} width={32} />
        <Tooltip content={tooltip} />
        <Legend />
        {series.map(({ key, name, color }) => type === "line" ? (
          <Line key={key} type="monotone" dataKey={key} name={name} stroke={color} strokeWidth={2.4} dot={false} />
        ) : type === "area" ? (
          <Area key={key} type="monotone" dataKey={key} name={name} stroke={color} fill={color} fillOpacity={0.16} strokeWidth={2.4} />
        ) : (
          <Bar key={key} dataKey={key} name={name} fill={color} radius={[6, 6, 0, 0]} maxBarSize={24} />
        ))}
      </Chart>
    </ResponsiveContainer>
  );
}

function ReviewShare({ type, games, colors, tooltip }) {
  const ranked = [...games].filter(game => game.reviews > 0).sort((a, b) => b.reviews - a.reviews);
  const data = ranked.slice(0, 7).map(game => ({ ...game, name: `${game.date} ${game.label}` }));
  const otherReviews = ranked.slice(7).reduce((sum, game) => sum + game.reviews, 0);
  if (otherReviews) data.push({ label: "Other matches", name: "Other matches", reviews: otherReviews });
  const palette = [colors.overall, colors.security, colors.family, colors.volume];
  if (!data.length) return <p className={styles.chartEmpty}>No reviews available to show a share yet.</p>;

  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie
          data={data}
          dataKey="reviews"
          nameKey="name"
          innerRadius={type === "donut" ? "46%" : 0}
          outerRadius="74%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry, index) => <Cell key={entry.id ?? "other"} fill={palette[index % palette.length]} />)}
        </Pie>
        <Tooltip content={tooltip} />
        <Legend formatter={value => String(value).slice(0, 23)} wrapperStyle={{ fontSize: 11, color: colors.text }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function VolumeChart({ type, games, colors, axis, tooltip }) {
  if (type === "pie" || type === "donut") return <ReviewShare type={type} games={games} colors={colors} tooltip={tooltip} />;
  return (
    <ResponsiveContainer>
      <ComposedChart data={games} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="date" {...axis} minTickGap={28} />
        <YAxis yAxisId="reviews" {...axis} width={36} />
        <YAxis yAxisId="score" orientation="right" domain={[1, 5]} {...axis} width={28} />
        <Tooltip content={tooltip} />
        <Legend />
        {type === "bar" ? (
          <>
            <Bar yAxisId="reviews" dataKey="reviews" name="Reviews" fill={colors.volume} radius={[6, 6, 0, 0]} maxBarSize={18} />
            <Bar yAxisId="score" dataKey="overall" name="Overall" fill={colors.overall} radius={[6, 6, 0, 0]} maxBarSize={18} />
          </>
        ) : type === "area" ? (
          <>
            <Area yAxisId="reviews" type="monotone" dataKey="reviews" name="Reviews" stroke={colors.volume} fill={colors.volume} fillOpacity={0.24} />
            <Area yAxisId="score" type="monotone" dataKey="overall" name="Overall" stroke={colors.overall} fill={colors.overall} fillOpacity={0.12} strokeWidth={2.4} />
          </>
        ) : (
          <>
            <Line yAxisId="reviews" type="monotone" dataKey="reviews" name="Reviews" stroke={colors.volume} strokeWidth={2.4} dot={false} />
            <Line yAxisId="score" type="monotone" dataKey="overall" name="Overall" stroke={colors.overall} strokeWidth={2.4} dot={false} />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
