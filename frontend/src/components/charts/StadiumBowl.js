"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Charts.module.css";

const STOPS = ["#b45309", "#ea580c", "#eab308", "#237eac", "#1d4ed8"];
const CX = 500;
const CY = 400;
const INNER = 170;
const ROW_GAP = 8.8;
const ROWS = 14;
const TIER_AT = 7;
const TIER_GAP = 14;
const STEP = 2.2;

const STANDS = [
  { key: "NORTH", label: "North", start: 50, end: 130 },
  { key: "EAST", label: "East", start: -40, end: 40 },
  { key: "SOUTH", label: "South", start: 230, end: 310 },
  { key: "WEST", label: "West", start: 140, end: 220 },
];

const GAPS = [45, 135, 225, 315];

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function mix(from, to, amount) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  return rgbToHex(
    Math.round(start[0] + (end[0] - start[0]) * amount),
    Math.round(start[1] + (end[1] - start[1]) * amount),
    Math.round(start[2] + (end[2] - start[2]) * amount),
  );
}

function shade(hex, amount) {
  const [red, green, blue] = hexToRgb(hex);
  const shift = (channel) => {
    const next = amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount;
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  return rgbToHex(shift(red), shift(green), shift(blue));
}

function scoreColor(score) {
  const clamped = Math.min(5, Math.max(1, score || 1));
  if (clamped >= 5) return STOPS[4];
  const index = Math.min(3, Math.floor(clamped) - 1);
  return mix(STOPS[index], STOPS[index + 1], clamped - Math.floor(clamped));
}

function polar(radius, angle) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY - Math.sin(rad) * radius,
  };
}

function rowRadius(row) {
  return INNER + row * ROW_GAP + (row >= TIER_AT ? TIER_GAP : 0);
}

const OUTER = rowRadius(ROWS - 1);

function arcPath(radius, start, end) {
  const from = polar(radius, start);
  const to = polar(radius, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 0 ${to.x} ${to.y}`;
}

function sectorPath(inner, outer, start, end) {
  const outerStart = polar(outer, start);
  const outerEnd = polar(outer, end);
  const innerEnd = polar(inner, end);
  const innerStart = polar(inner, start);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${large} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${large} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function seatsFor(stand) {
  const seats = [];
  const count = Math.floor((stand.end - stand.start) / STEP);

  for (let row = 0; row < ROWS; row += 1) {
    const radius = rowRadius(row);
    const slot = radius * ((STEP * Math.PI) / 180);

    for (let index = 0; index < count; index += 1) {
      if (index % 9 === 4) continue;
      const angle = stand.start + STEP * (index + 0.5);
      const pos = polar(radius, angle);
      seats.push({
        ...pos,
        angle,
        w: Math.min(slot * 0.68, 9),
        h: ROW_GAP * 0.55,
        fromFront: row / (ROWS - 1),
        row,
      });
    }
  }

  return seats;
}

const MODEL = STANDS.map((stand) => {
  const concourse = rowRadius(TIER_AT - 1) + (rowRadius(TIER_AT) - rowRadius(TIER_AT - 1)) / 2;
  return {
    ...stand,
    seats: seatsFor(stand),
    backing: sectorPath(INNER - 6, OUTER + 8, stand.start, stand.end),
    concourse: arcPath(concourse, stand.start + 1.2, stand.end - 1.2),
    roof: arcPath(OUTER + 14, stand.start, stand.end),
    rail: arcPath(INNER - 10, stand.start, stand.end),
    labelAt: polar(OUTER + 62, (stand.start + stand.end) / 2),
  };
});

const STAIRS = GAPS.flatMap((angle) =>
  Array.from({ length: 8 }, (_, step) => {
    const radius = INNER + 6 + step * ((OUTER - INNER - 8) / 7);
    return { ...polar(radius, angle), angle };
  }),
);

function findSection(sections, key) {
  return sections.find((section) => section.section.toUpperCase() === key) || null;
}

function Pitch() {
  const x = CX - 116;
  const y = CY - 76;
  const w = 232;
  const h = 152;
  const line = "rgba(255,255,255,0.9)";
  const boxDepth = 38;
  const boxHeight = 86;
  const goalDepth = 13;
  const goalHeight = 40;

  return (
    <g>
      <circle cx={CX} cy={CY} r={INNER - 22} fill="#145c34" />
      <defs>
        <clipPath id="stadium-pitch">
          <rect x={x} y={y} width={w} height={h} rx="6" />
        </clipPath>
      </defs>
      <g clipPath="url(#stadium-pitch)">
        {Array.from({ length: 10 }, (_, index) => (
          <rect
            key={index}
            x={x + index * (w / 10)}
            y={y}
            width={w / 10}
            height={h}
            fill={index % 2 === 0 ? "#1c7a46" : "#17693c"}
          />
        ))}
      </g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill="none" stroke={line} strokeWidth="2" />
      <line x1={CX} y1={y} x2={CX} y2={y + h} stroke={line} strokeWidth="2" />
      <circle cx={CX} cy={CY} r="26" fill="none" stroke={line} strokeWidth="2" />
      <circle cx={CX} cy={CY} r="3" fill={line} />
      <rect x={x} y={CY - boxHeight / 2} width={boxDepth} height={boxHeight} fill="none" stroke={line} strokeWidth="2" />
      <rect x={x + w - boxDepth} y={CY - boxHeight / 2} width={boxDepth} height={boxHeight} fill="none" stroke={line} strokeWidth="2" />
      <rect x={x} y={CY - goalHeight / 2} width={goalDepth} height={goalHeight} fill="none" stroke={line} strokeWidth="2" />
      <rect x={x + w - goalDepth} y={CY - goalHeight / 2} width={goalDepth} height={goalHeight} fill="none" stroke={line} strokeWidth="2" />
      <circle cx={x + 26} cy={CY} r="2.4" fill={line} />
      <circle cx={x + w - 26} cy={CY} r="2.4" fill={line} />
      <path d={`M ${x + boxDepth} ${CY - 16} A 20 20 0 0 0 ${x + boxDepth} ${CY + 16}`} fill="none" stroke={line} strokeWidth="2" />
      <path d={`M ${x + w - boxDepth} ${CY - 16} A 20 20 0 0 1 ${x + w - boxDepth} ${CY + 16}`} fill="none" stroke={line} strokeWidth="2" />
      <path d={`M ${x + 8} ${y} A 8 8 0 0 0 ${x} ${y + 8}`} fill="none" stroke={line} strokeWidth="2" />
      <path d={`M ${x + w - 8} ${y} A 8 8 0 0 1 ${x + w} ${y + 8}`} fill="none" stroke={line} strokeWidth="2" />
      <path d={`M ${x} ${y + h - 8} A 8 8 0 0 0 ${x + 8} ${y + h}`} fill="none" stroke={line} strokeWidth="2" />
      <path d={`M ${x + w} ${y + h - 8} A 8 8 0 0 0 ${x + w - 8} ${y + h}`} fill="none" stroke={line} strokeWidth="2" />
      <rect x={x - 7} y={CY - 18} width="7" height="36" rx="1" fill={line} />
      <rect x={x + w} y={CY - 18} width="7" height="36" rx="1" fill={line} />
    </g>
  );
}

export default function StadiumBowl({ sections, dark }) {
  const wrapRef = useRef(null);
  const tipRef = useRef(null);
  const point = useRef({ x: 16, y: 16 });
  const [activeKey, setActiveKey] = useState(null);
  const [bowlHover, setBowlHover] = useState(false);
  const byStand = useMemo(
    () => Object.fromEntries(STANDS.map((stand) => [stand.key, findSection(sections, stand.key)])),
    [sections],
  );
  const active = activeKey ? byStand[activeKey] : null;
  const activeStand = STANDS.find((stand) => stand.key === activeKey) || null;

  function placeTip(event) {
    const bounds = wrapRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = 196;
    const height = 118;
    let x = event.clientX - bounds.left + 16;
    let y = event.clientY - bounds.top + 16;
    if (x + width > bounds.width) x = event.clientX - bounds.left - width - 14;
    if (y + height > bounds.height) y = event.clientY - bounds.top - height - 14;
    point.current = { x: Math.max(8, x), y: Math.max(8, y) };
    if (tipRef.current) {
      tipRef.current.style.left = `${point.current.x}px`;
      tipRef.current.style.top = `${point.current.y}px`;
    }
  }

  function enterStand(key, event) {
    placeTip(event);
    setActiveKey(key);
    setBowlHover(true);
  }

  function leaveStand() {
    setActiveKey(null);
    setBowlHover(false);
  }

  useEffect(() => {
    if (!tipRef.current) return;
    tipRef.current.style.left = `${point.current.x}px`;
    tipRef.current.style.top = `${point.current.y}px`;
  }, [activeKey, bowlHover]);

  const empty = dark ? "#24384f" : "#c5d3e0";
  const concrete = dark ? "#10243c" : "#d5e1ec";
  const roof = dark ? "#07111e" : "#8ea2b5";
  const ink = dark ? "#e5edf6" : "#10345a";
  const bowlInner = dark ? "#0c1e34" : "#eef4f8";

  return (
    <div className={styles.bowl}>
      <div className={styles.scale}>
        <span>Security 1</span>
        <span className={styles.scaleBar} />
        <span>5</span>
      </div>
      <div className={styles.stadiumWrap} ref={wrapRef}>
      <svg className={styles.stadium} viewBox="100 8 800 784" role="img" aria-label="Stadium tribunes coloured by security score">
        <defs>
          <radialGradient id="stadium-bowl" cx="50%" cy="48%" r="62%">
            <stop offset="0%" stopColor={bowlInner} />
            <stop offset="72%" stopColor={dark ? "#0b1c33" : "#d7e4ef"} />
            <stop offset="100%" stopColor={dark ? "#06101c" : "#b7c9d8"} />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={OUTER + 52} fill="url(#stadium-bowl)" />
        <circle cx={CX} cy={CY} r={OUTER + 24} fill="none" stroke={dark ? "#1c3552" : "#c3d3e2"} strokeWidth="8" />
        {STAIRS.map((step, index) => (
          <rect
            key={index}
            x={-9}
            y={-2.2}
            width="18"
            height="4.4"
            rx="1"
            fill={concrete}
            transform={`translate(${step.x} ${step.y}) rotate(${-step.angle - 90})`}
          />
        ))}
        {MODEL.map((stand) => {
          const section = byStand[stand.key];
          const base = section ? scoreColor(section.security) : empty;
          const selected = activeKey === stand.key;
          return (
            <g
              key={stand.key}
              className={styles.stand}
              opacity={!activeKey || selected ? 1 : 0.38}
              onMouseEnter={(event) => enterStand(stand.key, event)}
              onMouseMove={placeTip}
              onMouseLeave={leaveStand}
            >
              <path d={stand.backing} fill={shade(base, -0.28)} stroke={selected ? base : "transparent"} strokeWidth="3" />
              <path d={stand.roof} fill="none" stroke={roof} strokeWidth="8" strokeLinecap="butt" />
              <path d={stand.concourse} fill="none" stroke={concrete} strokeWidth="11" />
              <path d={stand.rail} fill="none" stroke={dark ? "#d7e4f0" : "#ffffff"} strokeWidth="2" opacity="0.8" />
              {stand.seats.map((seat, index) => (
                <rect
                  key={index}
                  x={-seat.w / 2}
                  y={-seat.h / 2}
                  width={seat.w}
                  height={seat.h}
                  rx="1.5"
                  fill={shade(base, 0.2 - seat.fromFront * 0.46 - (seat.row % 2) * 0.05)}
                  transform={`translate(${seat.x} ${seat.y}) rotate(${-seat.angle - 90})`}
                />
              ))}
              <g transform={`translate(${stand.labelAt.x} ${stand.labelAt.y})`}>
                <rect x="-42" y="-18" width="84" height="36" rx="10" fill={dark ? "#071525" : "#ffffff"} stroke={base} strokeWidth="1.6" />
                <text y="-2" textAnchor="middle" fill={ink} fontSize="10" fontWeight="700" letterSpacing="1.4">
                  {stand.label.toUpperCase()}
                </text>
                <text y="12" textAnchor="middle" fill={base} fontSize="12" fontWeight="700">
                  {section ? section.security.toFixed(2) : "–"}
                </text>
              </g>
            </g>
          );
        })}
        {GAPS.map((angle) => {
          const pos = polar(OUTER + 22, angle);
          return (
            <g key={angle} transform={`translate(${pos.x} ${pos.y})`}>
              <circle r="6.5" fill={dark ? "#10283f" : "#edf3f8"} stroke={dark ? "#8fb4d4" : "#9eb4c8"} strokeWidth="1.4" />
              <circle r="2.4" fill="#fbbf24" />
            </g>
          );
        })}
        <Pitch />
      </svg>
      {bowlHover && activeStand ? (
        <div ref={tipRef} className={`${styles.tip} ${styles.hoverBox}`}>
          <strong>{activeStand.label}</strong>
          {active ? (
            <>
              <span>Overall {active.overall.toFixed(2)}</span>
              <span>Security {active.security.toFixed(2)}</span>
              <span>{active.reviews.toLocaleString("en-GB")} reviews</span>
            </>
          ) : (
            <span>No reviews for this stand</span>
          )}
        </div>
      ) : null}
      </div>
      <div className={styles.standList}>
        {STANDS.map((stand) => {
          const section = byStand[stand.key];
          const selected = activeKey === stand.key;
          return (
            <button
              key={stand.key}
              type="button"
              className={selected ? `${styles.standStat} ${styles.standStatActive}` : styles.standStat}
              onMouseEnter={() => setActiveKey(stand.key)}
              onMouseLeave={() => setActiveKey(null)}
              onFocus={() => setActiveKey(stand.key)}
              onBlur={() => setActiveKey(null)}
            >
              <i style={{ background: section ? scoreColor(section.security) : empty }} />
              <strong>{stand.label}</strong>
              {section ? (
                <>
                  <span>Overall {section.overall.toFixed(2)}</span>
                  <span>Security {section.security.toFixed(2)}</span>
                  <span>{section.reviews.toLocaleString("en-GB")} reviews</span>
                </>
              ) : (
                <span>No reviews for this stand</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
