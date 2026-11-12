"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { fetchGames, fetchSections } from "@/lib/analytics";
import StadiumBowl from "./StadiumBowl";
import styles from "./Charts.module.css";

const light = {
  grid: "#e3ebf2",
  text: "#637386",
  overall: "#1d4ed8",
  security: "#0f766e",
  family: "#1e3a8a",
  volume: "#7eb6d6",
};

const dark = {
  grid: "#253c58",
  text: "#a8b8cb",
  overall: "#67b6e0",
  security: "#5eead4",
  family: "#93c5fd",
  volume: "#3d6f90",
};

function useChartColors() {
  const [colors, setColors] = useState(light);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setColors(root.classList.contains("dark") ? dark : light);
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}

function average(rows, key) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;

  return (
    <div className={styles.tip}>
      <strong>{point?.label || label}</strong>
      {point?.date ? <span>{point.date}</span> : null}
      {payload.map((item) => (
        <span key={item.dataKey}>
          {item.name}: {Number(item.value).toFixed(item.dataKey === "reviews" ? 0 : 2)}
        </span>
      ))}
    </div>
  );
}

function Card({ title, text, wide, frame, children }) {
  return (
    <article className={wide ? `${styles.card} ${styles.wide}` : styles.card}>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className={frame === "bowl" ? styles.bowl : styles.plot}>{children}</div>
    </article>
  );
}

export default function AnalyticsBoard() {
  const colors = useChartColors();
  const [games, setGames] = useState([]);
  const [sections, setSections] = useState([]);
  const [gameId, setGameId] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    fetchGames()
      .then((rows) => {
        if (!active) return;
        setGames(rows);
        setGameId(rows.at(-1)?.id ?? null);
        setStatus(rows.length ? "ready" : "empty");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!gameId) return undefined;
    let active = true;

    fetchSections(gameId)
      .then((rows) => {
        if (active) setSections(rows);
      })
      .catch(() => {
        if (active) setSections([]);
      });

    return () => {
      active = false;
    };
  }, [gameId]);

  const selected = games.find((game) => game.id === gameId) || null;
  const ranked = useMemo(
    () => [...games].sort((a, b) => b.overall - a.overall).slice(0, 8),
    [games],
  );
  const radar = useMemo(() => {
    const league = {
      overall: average(games, "overall"),
      security: average(games, "security"),
      family: average(games, "family"),
    };
    const match = selected || league;

    return [
      { metric: "Overall", league: league.overall, match: match.overall },
      { metric: "Security", league: league.security, match: match.security },
      { metric: "Family", league: league.family, match: match.family },
    ];
  }, [games, selected]);

  const axis = { stroke: colors.text, fontSize: 12, tickLine: false, axisLine: false };

  if (status === "loading") return <p className={styles.state}>Loading match analytics…</p>;
  if (status === "error") {
    return (
      <p className={styles.state}>
        The analytics API is not reachable. Start the backend on port 5000 and refresh.
      </p>
    );
  }
  if (status === "empty") return <p className={styles.state}>No match analytics have been returned yet.</p>;

  return (
    <div className={styles.board}>
      <div className={styles.toolbar}>
        <p className={styles.kicker}>Live from /api/analytics</p>
        <label className={styles.selectLabel}>
          Focus match
          <select
            className={styles.select}
            value={gameId ?? ""}
            onChange={(event) => setGameId(Number(event.target.value))}
          >
            {[...games].reverse().map((game) => (
              <option key={game.id} value={game.id}>
                {game.date} · {game.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span>Matches</span>
          <strong>{games.length}</strong>
        </div>
        <div className={styles.kpi}>
          <span>Reviews</span>
          <strong>{games.reduce((sum, game) => sum + game.reviews, 0).toLocaleString("en-GB")}</strong>
        </div>
        <div className={styles.kpi}>
          <span>Avg overall</span>
          <strong>{average(games, "overall").toFixed(2)}</strong>
        </div>
        <div className={styles.kpi}>
          <span>Avg security</span>
          <strong>{average(games, "security").toFixed(2)}</strong>
        </div>
      </div>

      <div className={styles.grid}>
        <Card
          wide
          title="Score trend"
          text="Overall, security, and family-friendly averages across matchdays. Drag the brush to focus a stretch of the season."
        >
          <ResponsiveContainer>
            <AreaChart data={games} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="overallFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.overall} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.overall} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="date" {...axis} minTickGap={24} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...axis} width={32} />
              <Tooltip content={<ChartTip />} />
              <Legend />
              <Area type="monotone" dataKey="overall" name="Overall" stroke={colors.overall} fill="url(#overallFill)" strokeWidth={2.4} />
              <Area type="monotone" dataKey="security" name="Security" stroke={colors.security} fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="family" name="Family" stroke={colors.family} fill="transparent" strokeWidth={2} />
              <Brush dataKey="date" height={26} stroke={colors.overall} travellerWidth={8} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Volume and rating" text="How many fans responded, set against the overall score of that match.">
          <ResponsiveContainer>
            <ComposedChart data={games} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="date" {...axis} minTickGap={28} />
              <YAxis yAxisId="reviews" {...axis} width={36} />
              <YAxis yAxisId="score" orientation="right" domain={[1, 5]} {...axis} width={28} />
              <Tooltip content={<ChartTip />} />
              <Bar yAxisId="reviews" dataKey="reviews" name="Reviews" fill={colors.volume} radius={[6, 6, 0, 0]} maxBarSize={18} />
              <Line yAxisId="score" type="monotone" dataKey="overall" name="Overall" stroke={colors.overall} strokeWidth={2.4} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="League vs match" text={selected ? `${selected.label} compared with the season average.` : "Season average profile."}>
          <ResponsiveContainer>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={colors.grid} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: colors.text, fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
              <Radar dataKey="league" name="Season" stroke={colors.family} fill={colors.family} fillOpacity={0.18} />
              <Radar dataKey="match" name="Match" stroke={colors.overall} fill={colors.overall} fillOpacity={0.28} />
              <Legend />
              <Tooltip content={<ChartTip />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Highest rated matches" text="The eight fixtures with the strongest overall fan score.">
          <ResponsiveContainer>
            <BarChart data={ranked} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} horizontal={false} />
              <XAxis type="number" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...axis} />
              <YAxis type="category" dataKey="label" width={128} {...axis} tickFormatter={(value) => String(value).slice(0, 18)} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="overall" name="Overall" fill={colors.overall} radius={[0, 8, 8, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Turnout vs rating" text="Each point is a match. Larger response counts sit further right.">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} />
              <XAxis dataKey="reviews" name="Reviews" {...axis} />
              <YAxis dataKey="overall" name="Overall" domain={[1, 5]} {...axis} width={32} />
              <ZAxis range={[80, 80]} />
              <Tooltip content={<ChartTip />} />
              <Scatter data={games} name="Match" fill={colors.overall} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card
          wide
          frame="bowl"
          title="Stadium sections"
          text={
            selected
              ? `Tribune colour follows the security score for ${selected.label}. Hover a stand for overall, security, and review volume.`
              : "Pick a match to compare the tribunes."
          }
        >
          <StadiumBowl sections={sections} dark={colors === dark} />
        </Card>
      </div>
    </div>
  );
}
