"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./RewardWheel.module.css";

const COLORS = ["#174a81", "#2577b3", "#10335e", "#368ec4", "#3461a1", "#d29b2c"];
const SPIN_MS = 4500;

function landingAngle(index, count) {
  return (360 - (index + 0.5) * (360 / count)) % 360;
}

function wedge(index, count) {
  const start = ((index * 360 / count) - 90) * Math.PI / 180;
  const end = (((index + 1) * 360 / count) - 90) * Math.PI / 180;
  return `M160 160 L${160 + 148 * Math.cos(start)} ${160 + 148 * Math.sin(start)} A148 148 0 ${count === 1 ? 1 : 0} 1 ${160 + 148 * Math.cos(end)} ${160 + 148 * Math.sin(end)} Z`;
}

export default function RewardWheel({ ticketCode }) {
  const headingId = useId();
  const [phase, setPhase] = useState("loading");
  const [prizes, setPrizes] = useState([]);
  const [reward, setReward] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const base = `/api/tickets/${encodeURIComponent(ticketCode)}`;

  const loadStatus = useCallback(async (signal) => {
    setPhase("loading");
    setError("");
    try {
      const response = await fetch(`${base}/reward`, { cache: "no-store", signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to check your reward. Please try again.");
      if (!Array.isArray(data.prizes) || data.prizes.length === 0) throw new Error("Unable to load the reward wheel.");
      setPrizes(data.prizes);
      setReward(data.reward || null);
      if (data.reward) {
        const index = data.prizes.findIndex(prize => prize.id === data.reward.id);
        if (index < 0) throw new Error("Unable to display the saved reward.");
        setRotation(landingAngle(index, data.prizes.length));
        setPhase("claimed");
      } else {
        setRotation(0);
        setPhase(data.can_spin ? "ready" : "ineligible");
      }
    } catch (failure) {
      if (signal?.aborted) return;
      setError(failure.message || "Unable to check your reward.");
      setPhase("error");
    }
  }, [base]);

  useEffect(() => {
    const controller = new AbortController();
    loadStatus(controller.signal);
    return () => controller.abort();
  }, [loadStatus]);

  // A timer also completes the reveal when the tab was hidden during transition.
  useEffect(() => {
    if (phase !== "spinning") return;
    const timer = window.setTimeout(() => setPhase("claimed"), SPIN_MS + 150);
    return () => window.clearTimeout(timer);
  }, [phase]);

  async function spin() {
    if (phase !== "ready" || inFlight.current) return;
    inFlight.current = true;
    setPhase("requesting");
    setError("");
    try {
      const response = await fetch(`${base}/spin`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to confirm your spin. Check your reward before trying again.");
      const index = prizes.findIndex(prize => prize.id === data.reward?.id);
      if (index < 0) throw new Error("Unable to confirm the saved reward. Please check again.");
      setReward(data.reward);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (data.already_spun || reducedMotion) {
        setRotation(landingAngle(index, prizes.length));
        setPhase("claimed");
      } else {
        setPhase("spinning");
        setRotation(6 * 360 + landingAngle(index, prizes.length));
      }
    } catch (failure) {
      // A response can be lost after the server saved the result. Recheck status
      // rather than assuming the spin failed and offering another draw.
      setError(failure.message || "Unable to confirm your spin. Please check your reward.");
      setPhase("error");
    } finally {
      inFlight.current = false;
    }
  }

  const busy = ["loading", "requesting", "spinning"].includes(phase);
  return (
    <section className={`panel ${styles.panel}`} aria-labelledby={headingId}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>A little matchday thank-you</p>
        <h1 id={headingId}>Your review is in. Your reward awaits.</h1>
        <p>Thanks for helping improve the fan experience. Each reviewed ticket gets one spin and one discount for a future match ticket.</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.playArea}>
          <div className={styles.wheelFrame} aria-hidden="true">
            <div className={styles.pointer} />
            <svg
              viewBox="0 0 320 320"
              className={`${styles.wheel} ${phase === "spinning" ? styles.spinning : ""}`}
              style={{ transform: `rotate(${rotation}deg)` }}
              onTransitionEnd={event => {
                if (event.propertyName === "transform" && phase === "spinning") setPhase("claimed");
              }}
            >
              <circle cx="160" cy="160" r="157" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
              {prizes.map((prize, index) => (
                <g key={prize.id}>
                  <path d={wedge(index, prizes.length)} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
                  <text x="160" y="64" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(index + 0.5) * 360 / prizes.length} 160 160)`} fill="white" fontSize="22" fontWeight="750">{prize.discount_percent}%</text>
                </g>
              ))}
            </svg>
            <div className={styles.hub}><span>FAN</span><small>REWARDS</small></div>
          </div>
          {phase === "error" ? (
            <button type="button" className={styles.spinButton} onClick={() => loadStatus()}>Check my reward</button>
          ) : (
            <button type="button" className={styles.spinButton} onClick={spin} disabled={phase !== "ready"}>
              {phase === "loading" ? "Checking your ticket..." : phase === "requesting" ? "Saving your reward..." : phase === "spinning" ? "Good luck!" : phase === "claimed" ? "Spin used" : phase === "ineligible" ? "Review required" : "Spin for your reward"}
            </button>
          )}
          <p className={styles.smallPrint}>One spin per ticket. Your result is saved, even if you refresh.</p>
          <div aria-live="polite" aria-atomic="true">
            {busy ? <p className={styles.status}>{phase === "spinning" ? "The wheel is spinning." : phase === "loading" ? "Checking reward availability." : "Confirming your reward."}</p> : null}
            {phase === "ineligible" ? <p className={styles.status}>Submit a review for this ticket to unlock your spin.</p> : null}
          </div>
          {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        </div>
        <div className={styles.details}>
          {phase === "claimed" && reward ? (
            <div className={styles.result} role="status">
              <p className={styles.eyebrow}>{reward.discount_percent === 100 ? "The rarest matchday reward" : "Your matchday reward"}</p>
              <h2>{reward.label}</h2>
              <p>{reward.discount_percent === 100 ? "A full discount on one future match ticket. You landed the 1-in-1,000 reward!" : "A discount on one future match ticket. Thanks for sharing your matchday."}</p>
              <span className={styles.referenceLabel}>Keep your reward reference</span>
              <code className={styles.reference}>{reward.code}</code>
              <p className={styles.smallPrint}>Present this reference to club staff. Redemption needs club confirmation; online checkout redemption is not connected yet.</p>
            </div>
          ) : (
            <div className={styles.highlight}>
              <span className={styles.rareBadge}>1 IN 1,000</span>
              <h2>A future ticket, on us.</h2>
              <p>Land the golden segment for 100% off one future match ticket.</p>
            </div>
          )}
          <div className={styles.odds}>
            <h2>Every spin wins a discount</h2>
            <p>Segments have different chances. Here are the exact odds:</p>
            <ul>
              {prizes.map((prize, index) => (
                <li key={prize.id}>
                  <span className={styles.prizeName}><span className={styles.swatch} style={{ background: COLORS[index % COLORS.length] }} />{prize.label}</span>
                  <span>{Number((prize.chance * 100).toFixed(1))}% chance</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
