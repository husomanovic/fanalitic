"use client";

import { useState } from "react";
import ScoreSlider from "./ScoreSlider";
import ReviewShell from "./ReviewShell";
import RewardWheel from "./RewardWheel";

const SCORE_FIELDS = [
  {
    key: "comfort_score",
    label: "Comfort",
    hint: "Seating, space, and stand atmosphere",
  },
  {
    key: "experience_score",
    label: "Experience",
    hint: "How the matchday felt overall",
  },
  {
    key: "game_score",
    label: "Game experience",
    hint: "The football itself — pace, energy, spectacle",
  },
  {
    key: "family_friendly_score",
    label: "Family friendly",
    hint: "How welcoming it felt for families",
  },
  {
    key: "organization_score",
    label: "Organisation",
    hint: "Entry, queues, info, and staff",
  },
  {
    key: "security_score",
    label: "Security",
    hint: "How safe you felt during the match",
  },
  {
    key: "overall_score",
    label: "Overall score",
    hint: "Your final impression of the day",
  },
];

const INITIAL_SCORES = Object.fromEntries(
  SCORE_FIELDS.map((field) => [field.key, 3]),
);

export default function ReviewForm({ ticketCode, ticket = null }) {
  const [scores, setScores] = useState(INITIAL_SCORES);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const matchLabel = ticket
    ? `${ticket.HOME_TEAM || "Home"} vs ${ticket.AWAY_TEAM || "Away"}`
    : null;
  const stadiumLabel = ticket?.STADIUM || null;
  const gameDateLabel = ticket?.GAME_DATE ? String(ticket.GAME_DATE).replace("T", " ").slice(0, 16) : null;

  const average =
    SCORE_FIELDS.reduce((sum, field) => sum + Number(scores[field.key]), 0) /
    SCORE_FIELDS.length;
  const averageLabel = average.toFixed(1);
  const ringProgress = `${((average - 1) / 4) * 100}%`;

  function updateScore(key, value) {
    setScores((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!ticketCode || submitting) return;

    setSubmitting(true);
    setError("");

    const payload = {
      ticket_code: ticketCode,
      comfort_score: scores.comfort_score,
      experience_score: scores.experience_score,
      game_score: scores.game_score,
      family_friendly_score: scores.family_friendly_score,
      organization_score: scores.organization_score,
      security_score: scores.security_score,
      overall_score: scores.overall_score,
      feedback_text: feedback.trim(),
    };

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 409 || data.reason === "ALREADY_REVIEWED" || data.review_used === true) {
        throw new Error("Ticket already used for review.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit review");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ticketCode) {
    return (
      <ReviewShell>
        <section className="panel mx-auto max-w-xl px-5 py-10 text-center sm:px-8 sm:py-12">
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-semibold tracking-tight sm:text-3xl">
            Enter your ticket code
          </h1>
          <p
            className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base"
            style={{ color: "var(--muted)" }}
          >
            Go to /FANLYTICS to type or scan your ticket code before leaving a
            review.
          </p>
        </section>
      </ReviewShell>
    );
  }

  if (submitted) {
    return <ReviewShell><RewardWheel ticketCode={ticketCode} /></ReviewShell>;
  }

  return (
    <ReviewShell>
      <div className="panel mb-6 animate-rise-delay-1 px-4 py-5 sm:mb-8 sm:px-6 sm:py-6 lg:mb-10 lg:px-8 lg:py-7 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-12">
        <div>
          <p
            className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] sm:text-xs"
            style={{ color: "var(--primary)" }}
          >
            {ticketCode}
          </p>
          <h1 className="font-[family-name:var(--font-sora)] text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-3xl lg:text-[2.35rem]">
            Rate the services at the match
          </h1>
          {matchLabel ? (
            <p className="mt-2 text-sm font-semibold sm:text-base">
              {matchLabel}
              {stadiumLabel ? ` · ${stadiumLabel}` : ""}
            </p>
          ) : null}
          {gameDateLabel ? <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Game date: {gameDateLabel}</p> : null}
        </div>
        <p
          className="mt-3 max-w-xl text-sm leading-relaxed sm:text-base lg:mt-0 lg:justify-self-end lg:text-right"
          style={{ color: "var(--muted)" }}
        >
          Score each part of matchday from 1 to 5, add an optional note, then
          send the full review tied to your ticket.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid animate-rise-delay-2 gap-5 sm:gap-6 lg:gap-7"
      >
        <section className="panel overflow-hidden">
          <div
            className="flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-6 sm:py-4"
            style={{ borderColor: "var(--border)", background: "var(--primary-soft)" }}
          >
            <div>
              <h2 className="font-[family-name:var(--font-sora)] text-sm font-semibold tracking-tight sm:text-base">
                Score the matchday
              </h2>
              <p className="text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
                Rate every part of matchday from 1 to 5
              </p>
            </div>
            <span
              className="hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex"
              style={{ background: "var(--surface)", color: "var(--primary)" }}
            >
              Live average {averageLabel}
            </span>
          </div>

          <div className="grid gap-7 px-4 py-5 sm:gap-8 sm:px-6 sm:py-7 md:grid-cols-2 md:gap-x-8 md:gap-y-9 lg:gap-x-10 lg:px-8 lg:py-8">
            {SCORE_FIELDS.map((field) => (
              <ScoreSlider
                key={field.key}
                id={field.key}
                label={field.label}
                hint={field.hint}
                value={scores[field.key]}
                onChange={(value) => updateScore(field.key, value)}
              />
            ))}
          </div>
        </section>

        <section className="panel px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <label
                htmlFor="feedback"
                className="block text-[0.95rem] font-semibold tracking-tight sm:text-base"
              >
                Optional note
              </label>
              <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
                Anything that stuck with you after the final whistle
              </p>
            </div>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {feedback.length}/1000
            </span>
          </div>
          <textarea
            id="feedback"
            name="feedback"
            rows={4}
            maxLength={1000}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Share a short impression..."
            className="mt-4 w-full resize-y rounded-2xl border bg-transparent px-3.5 py-3 text-sm leading-relaxed outline-none transition focus:ring-2 sm:px-4 sm:text-[0.95rem]"
            style={{
              borderColor: "var(--border)",
              color: "var(--text)",
              caretColor: "var(--primary)",
              minHeight: "7rem",
            }}
          />
        </section>

        <section className="submit-band panel">
          <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 lg:p-6">
            <div className="flex items-center gap-4">
              <div
                className="pulse-ring shrink-0"
                style={{ "--pulse": ringProgress }}
                aria-hidden
              >
                <span className="font-[family-name:var(--font-sora)] text-lg font-bold tabular-nums sm:text-xl">
                  {averageLabel}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-sora)] text-base font-semibold tracking-tight sm:text-lg">
                  Ready to send your match review?
                </p>
                <p className="mt-1 text-xs leading-relaxed sm:text-sm" style={{ color: "var(--muted)" }}>
                  Submits all {SCORE_FIELDS.length} scores
                  {feedback.trim() ? " plus your note" : ""} for this ticket.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full shrink-0 rounded-2xl px-8 text-base font-semibold tracking-wide text-white transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-[15rem]"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)",
                boxShadow:
                  "0 12px 30px color-mix(in srgb, var(--primary) 35%, transparent)",
                height: "3.35rem",
              }}
            >
              {submitting ? "Sending..." : "Send match review"}
            </button>
          </div>

          {error ? (
            <p
              className="border-t px-4 py-3 text-sm sm:px-5 lg:px-6"
              style={{ borderColor: "var(--border)", color: "var(--danger)" }}
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </section>
      </form>
    </ReviewShell>
  );
}
