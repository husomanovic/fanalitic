"use client";

const MIN = 1;
const MAX = 5;
const STEP = 1;

export default function ScoreSlider({ id, label, hint, value, onChange }) {
  const fill = `${((Number(value) - MIN) / (MAX - MIN)) * 100}%`;

  return (
    <div className="grid gap-2.5 sm:gap-3">
      <div className="flex items-start justify-between gap-3 sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={id}
            className="block text-sm font-semibold tracking-tight sm:text-[0.95rem]"
          >
            {label}
          </label>
          {hint ? (
            <p
              className="mt-0.5 text-xs leading-snug sm:text-sm"
              style={{ color: "var(--muted)" }}
            >
              {hint}
            </p>
          ) : null}
        </div>
        <output
          htmlFor={id}
          className="shrink-0 rounded-lg px-2 py-1 text-center text-sm font-bold tabular-nums sm:min-w-14 sm:px-2.5 sm:text-base"
          style={{
            background: "var(--primary-soft)",
            color: "var(--primary)",
            minWidth: "3rem",
          }}
        >
          {Number(value)}
        </output>
      </div>

      <input
        id={id}
        className="score-slider"
        type="range"
        min={MIN}
        max={MAX}
        step={STEP}
        value={value}
        onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
        style={{ "--fill": fill }}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={value}
      />

      <div
        className="flex justify-between text-[0.7rem] font-medium tracking-wide sm:text-xs"
        style={{ color: "var(--muted)" }}
      >
        <span>1</span>
        <span>5</span>
      </div>
    </div>
  );
}
