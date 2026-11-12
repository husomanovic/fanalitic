"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReviewShell from "./ReviewShell";
import {
  TICKET_DIGITS,
  TICKET_PREFIX,
  buildTicketCode,
  parseTicketCode,
} from "../lib/ticketCode";

export default function TicketEntry() {
  const router = useRouter();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => stopScan();
  }, []);

  function stopScan() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  async function validateAndContinue(ticketCode) {
    setChecking(true);
    setError("");

    try {
      const response = await fetch(`/api/tickets/${encodeURIComponent(ticketCode)}/eligibility`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (response.status === 409 || data.review_used === true || data.reason === "ALREADY_REVIEWED") {
        if (response.ok && data.ticket) {
          stopScan();
          router.push(`/review/${encodeURIComponent(ticketCode)}`);
          return;
        }
        throw new Error(data.message || "Ticket already used for review.");
      }

      if (!response.ok) {
        throw new Error(data.message || (response.status === 404 ? "Ticket not found." : "Unable to check ticket. Please try again."));
      }

      if (data.can_review !== true || !data.ticket) {
        throw new Error("Unable to confirm ticket eligibility. Please try again.");
      }

      stopScan();
      router.push(`/review/${encodeURIComponent(ticketCode)}`);
    } catch (err) {
      setError(err.message || "Could not validate ticket");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const ticketCode = buildTicketCode(digits);
    if (!ticketCode) {
      setError(`Enter the ${TICKET_DIGITS} digits after ${TICKET_PREFIX}-`);
      return;
    }
    await validateAndContinue(ticketCode);
  }

  async function startScan() {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not available on this device. Enter the code manually.");
      return;
    }

    if (typeof window.BarcodeDetector === "undefined") {
      setError("QR scanning is not supported in this browser. Enter the code manually.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({
        formats: ["qr_code", "code_128", "code_39"],
      });

      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (!codes.length) return;
          const parsed = parseTicketCode(codes[0].rawValue);
          if (!parsed) {
            setError("Scanned code is not a valid FANLYTICS ticket.");
            return;
          }
          const nextDigits = parsed.slice(TICKET_PREFIX.length + 1);
          setDigits(nextDigits);
          await validateAndContinue(parsed);
        } catch {
        }
      }, 700);
    } catch {
      setError("Could not open the camera. Enter the code manually.");
      stopScan();
    }
  }

  return (
    <ReviewShell>
      <section className="panel mx-auto w-full max-w-xl animate-rise-delay-1 px-5 py-7 sm:px-8 sm:py-9">
        <p
          className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] sm:text-xs"
          style={{ color: "var(--primary)" }}
        >
          Matchday review
        </p>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-semibold tracking-tight sm:text-3xl">
          Enter or scan your ticket code
        </h1>
        <p className="mt-3 text-sm leading-relaxed sm:text-base" style={{ color: "var(--muted)" }}>
          Type the 9 digits after the dash, or scan the QR on your ticket.
          Format: <span className="font-semibold" style={{ color: "var(--text)" }}>{TICKET_PREFIX}-XXXXXXXXX</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Ticket code</span>
            <div
              className="flex overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--border)", background: "var(--field)" }}
            >
              <span
                className="flex items-center px-3 text-sm font-bold sm:px-4 sm:text-base"
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
              >
                {TICKET_PREFIX}-
              </span>
              <input
                inputMode="numeric"
                pattern="\d{9}"
                maxLength={TICKET_DIGITS}
                value={digits}
                onChange={(event) => {
                  setDigits(event.target.value.replace(/\D/g, "").slice(0, TICKET_DIGITS));
                  setError("");
                }}
                placeholder="123456789"
                className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-base font-semibold tracking-[0.18em] outline-none sm:px-4"
                style={{ color: "var(--text)", caretColor: "var(--primary)" }}
                aria-label="Nine digit ticket number"
              />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={scanning ? stopScan : startScan}
              className="rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:brightness-110"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
              }}
            >
              {scanning ? "Stop camera" : "Scan QR code"}
            </button>
            <button
              type="submit"
              disabled={checking || digits.length !== TICKET_DIGITS}
              className="rounded-2xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)",
                boxShadow:
                  "0 12px 30px color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              {checking ? "Checking..." : "Continue to review"}
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-4 text-sm" style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
        ) : null}

        {scanning ? (
          <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        ) : null}
      </section>
    </ReviewShell>
  );
}
