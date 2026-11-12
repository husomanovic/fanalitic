"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReviewForm from "./ReviewForm";
import ReviewShell from "./ReviewShell";
import { parseTicketCode } from "../lib/ticketCode";

export default function ReviewByTicket() {
  const params = useParams();
  const router = useRouter();
  const raw = params?.ticketId;
  const incoming = Array.isArray(raw)
    ? decodeURIComponent(raw[0] || "")
    : decodeURIComponent(raw || "");
  const ticketCode = parseTicketCode(incoming);

  const [status, setStatus] = useState(ticketCode ? "loading" : "invalid");
  const [message, setMessage] = useState("");
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    if (!ticketCode) {
      setStatus("invalid");
      setMessage("Use a valid ticket code: FANLYTICS-XXXXXXXXX");
      return;
    }

    let cancelled = false;

    async function loadTicket() {
      setStatus("loading");
      try {
        const response = await fetch(
          `/api/tickets/${encodeURIComponent(ticketCode)}`,
        );
        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (!response.ok) {
          setStatus("error");
          setMessage(data.message || "Ticket not found");
          return;
        }

        if (data.review_used) {
          setStatus("used");
          setMessage("This ticket has already been used for a review.");
          return;
        }

        setTicket(data);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not validate ticket. Try again.");
        }
      }
    }

    loadTicket();
    return () => {
      cancelled = true;
    };
  }, [ticketCode]);

  if (status === "ready" && ticketCode) {
    return <ReviewForm ticketCode={ticketCode} ticket={ticket} />;
  }

  return (
    <ReviewShell>
      <section className="panel mx-auto max-w-xl px-5 py-10 text-center sm:px-8 sm:py-12">
        {status === "loading" ? (
          <>
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-semibold tracking-tight">
              Checking your ticket…
            </h1>
            <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
              Validating {ticketCode}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-semibold tracking-tight">
              {status === "used" ? "Review already submitted" : "Ticket not available"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {message}
            </p>
            <button
              type="button"
              onClick={() => router.push("/FANLYTICS")}
              className="mt-6 rounded-2xl px-6 py-3 text-sm font-semibold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)",
              }}
            >
              Enter another code
            </button>
          </>
        )}
      </section>
    </ReviewShell>
  );
}
