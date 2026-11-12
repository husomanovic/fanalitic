const API = "/backend-api";

async function readJson(path) {
  const response = await fetch(`${API}${path}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("The API did not respond.");
  }

  return response.json();
}

function field(row, name) {
  if (row[name] != null) return row[name];
  const match = Object.keys(row).find((key) => key.toUpperCase() === name);
  return match ? row[match] : undefined;
}

function number(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value, fallback = "") {
  if (value == null || value === "") return fallback;
  return String(value);
}

function kickoffInput(value) {
  const match = String(value ?? "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : "";
}

function dateLabel(value, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value);
  const options = withTime
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" };
  return date.toLocaleString("en-GB", options);
}

async function sendJson(path, method, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "The API did not accept that.");
  }

  return payload;
}

export function createTeam(body) {
  return sendJson("/catalog/teams", "POST", body);
}

export function updateTeam(id, body) {
  return sendJson(`/catalog/teams/${id}`, "PUT", body);
}

export function deleteTeam(id) {
  return sendJson(`/catalog/teams/${id}`, "DELETE");
}

export function createStadium(body) {
  return sendJson("/catalog/stadiums", "POST", body);
}

export function updateStadium(id, body) {
  return sendJson(`/catalog/stadiums/${id}`, "PUT", body);
}

export function deleteStadium(id) {
  return sendJson(`/catalog/stadiums/${id}`, "DELETE");
}

export function createGame(body) {
  return sendJson("/catalog/games", "POST", body);
}

export function updateGame(id, body) {
  return sendJson(`/catalog/games/${id}`, "PUT", body);
}

export function deleteGame(id) {
  return sendJson(`/catalog/games/${id}`, "DELETE");
}

export function scoreText(value) {
  return value == null ? "—" : value.toFixed(2);
}

export async function fetchTeams() {
  const rows = await readJson("/catalog/teams");
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: number(field(row, "ID")),
    name: text(field(row, "NAME"), "Club"),
    logo: text(field(row, "LOGO_URL")),
    matches: number(field(row, "MATCHES")) ?? 0,
    overall: number(field(row, "AVG_OVERALL")),
    security: number(field(row, "AVG_SECURITY")),
  }));
}

export async function fetchStadiums() {
  const rows = await readJson("/catalog/stadiums");
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: number(field(row, "ID")),
    name: text(field(row, "NAME"), "Stadium"),
    city: text(field(row, "CITY")),
    country: text(field(row, "COUNTRY")),
    capacity: number(field(row, "CAPACITY")) ?? 0,
    reviews: number(field(row, "REVIEW_COUNT")) ?? 0,
    overall: number(field(row, "AVG_OVERALL")),
    security: number(field(row, "AVG_SECURITY")),
    comfort: number(field(row, "AVG_COMFORT")),
  }));
}

export async function fetchFixtures() {
  const rows = await readJson("/catalog/games");
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const home = text(field(row, "HOME_TEAM"), "Home");
    const away = text(field(row, "AWAY_TEAM"), "Away");
    const scoreHome = number(field(row, "SCORE_HOME"));
    const scoreAway = number(field(row, "SCORE_GUEST"));

    return {
      id: number(field(row, "ID")),
      date: dateLabel(field(row, "GAME_DATE")),
      kickoff: kickoffInput(field(row, "GAME_DATE")),
      homeTeamId: number(field(row, "HOME_TEAM_ID")),
      guestTeamId: number(field(row, "GUEST_TEAM_ID")),
      stadiumId: number(field(row, "STADIUM_ID")),
      home,
      away,
      label: `${home} vs ${away}`,
      score: scoreHome == null || scoreAway == null ? "—" : `${scoreHome}–${scoreAway}`,
      stadium: text(field(row, "STADIUM")),
      city: text(field(row, "CITY")),
      reviews: number(field(row, "REVIEW_COUNT")) ?? 0,
      overall: number(field(row, "AVG_OVERALL")),
      security: number(field(row, "AVG_SECURITY")),
    };
  });
}

export async function fetchReviewFeed() {
  const payload = await readJson("/analytics/feedback");
  const rows = Array.isArray(payload) ? payload : payload?.data;
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: index,
    home: text(field(row, "HOME_TEAM"), "Home"),
    away: text(field(row, "AWAY_TEAM"), "Away"),
    section: text(field(row, "SECTION"), "Section"),
    overall: number(field(row, "OVERALL_SCORE")),
    security: number(field(row, "SECURITY_SCORE")),
    comfort: number(field(row, "COMFORT_SCORE")),
    game: number(field(row, "GAME_SCORE")),
    text: text(field(row, "FEEDBACK_TEXT")),
    at: dateLabel(field(row, "INGESTED_AT"), true),
  }));
}

export async function fetchSecurity() {
  const payload = await readJson("/analytics/security");
  const sections = (Array.isArray(payload?.sections) ? payload.sections : []).map((row) => ({
    section: text(field(row, "SECTION"), "Section"),
    reviews: number(field(row, "REVIEW_COUNT")) ?? 0,
    security: number(field(row, "AVG_SECURITY")),
    overall: number(field(row, "AVG_OVERALL")),
  }));
  const matches = (Array.isArray(payload?.matches) ? payload.matches : []).map((row) => ({
    id: number(field(row, "GAME_ID")),
    home: text(field(row, "HOME_TEAM"), "Home"),
    away: text(field(row, "AWAY_TEAM"), "Away"),
    date: dateLabel(field(row, "GAME_DATE")),
    reviews: number(field(row, "REVIEW_COUNT")) ?? 0,
    security: number(field(row, "AVG_SECURITY")),
    overall: number(field(row, "AVG_OVERALL")),
  }));

  return { sections, matches };
}
