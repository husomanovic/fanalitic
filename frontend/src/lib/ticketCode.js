export const TICKET_PREFIX = "FANLYTICS";
export const TICKET_DIGITS = 9;

const FULL_CODE_RE = /^FANLYTICS-(\d{9})$/i;
const DIGITS_RE = /^\d{9}$/;

export function buildTicketCode(digits) {
  const clean = String(digits || "").replace(/\D/g, "").slice(0, TICKET_DIGITS);
  if (clean.length !== TICKET_DIGITS) return null;
  return `${TICKET_PREFIX}-${clean}`;
}

export function parseTicketCode(raw) {
  if (!raw) return null;

  const value = String(raw).trim();

  try {
    const asUrl = new URL(value);
    const parts = asUrl.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    const fromPath = parseTicketCode(decodeURIComponent(last));
    if (fromPath) return fromPath;
  } catch {
  }

  const full = value.match(FULL_CODE_RE);
  if (full) return `${TICKET_PREFIX}-${full[1]}`;

  if (DIGITS_RE.test(value)) return `${TICKET_PREFIX}-${value}`;

  const maybeDigits = value.replace(/\D/g, "");
  if (maybeDigits.length === TICKET_DIGITS) {
    return `${TICKET_PREFIX}-${maybeDigits}`;
  }

  return null;
}

export function getDigitsFromTicketCode(ticketCode) {
  const parsed = parseTicketCode(ticketCode);
  if (!parsed) return "";
  return parsed.slice(TICKET_PREFIX.length + 1);
}
