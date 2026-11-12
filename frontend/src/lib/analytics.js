const API = "/backend-api";

async function readJson(path, signal) {
  const response = await fetch(`${API}${path}`, { cache: "no-store", signal });

  if (!response.ok) {
    throw new Error("The analytics API did not respond.");
  }

  return response.json();
}

function field(row, name) {
  if (row[name] != null) return row[name];
  const match = Object.keys(row).find((key) => key.toUpperCase() === name);
  return match ? row[match] : undefined;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function normalizeGame(row) {
  const home = field(row, "HOME_TEAM") || "Home";
  const away = field(row, "AWAY_TEAM") || "Away";

  return {
    id: number(field(row, "GAME_ID")),
    home,
    away,
    label: `${home} vs ${away}`,
    date: dateLabel(field(row, "GAME_DATE")),
    sort: new Date(field(row, "GAME_DATE")).getTime() || 0,
    reviews: number(field(row, "REVIEW_COUNT")),
    overall: number(field(row, "AVG_OVERALL")),
    security: number(field(row, "AVG_SECURITY")),
    family: number(field(row, "AVG_FAMILY_FRIENDLY")),
  };
}

export function normalizeSection(row) {
  return {
    section: String(field(row, "SECTION") ?? "Section"),
    reviews: number(field(row, "REVIEW_COUNT")),
    overall: number(field(row, "AVG_OVERALL")),
    security: number(field(row, "AVG_SECURITY")),
  };
}

export async function fetchGames() {
  const rows = await readJson("/analytics/games");
  return (Array.isArray(rows) ? rows : []).map(normalizeGame).sort((a, b) => a.sort - b.sort);
}

export async function fetchSections(gameId) {
  const rows = await readJson(`/analytics/sections/${gameId}`);
  return (Array.isArray(rows) ? rows : []).map(normalizeSection);
}


export async function fetchStadiumSections(stadiumId = "all", signal) {
  const params = new URLSearchParams();
  if (stadiumId !== "all") params.set("stadiumId", String(stadiumId));
  const result = await readJson("/analytics/stadium-sections" + (params.size ? "?" + params.toString() : ""), signal);
  const score = value => value == null ? null : number(value);
  return {
    stadiums: (result.stadiums || []).map(row => ({
      id: number(field(row, "STADIUM_ID")),
      name: String(field(row, "STADIUM_NAME") || "Stadium"),
      city: String(field(row, "STADIUM_CITY") || ""),
    })),
    sections: (result.sections || []).map(normalizeSection),
    summary: {
      reviews: number(field(result.summary || {}, "REVIEW_COUNT")),
      matches: number(field(result.summary || {}, "MATCH_COUNT")),
      overall: score(field(result.summary || {}, "AVG_OVERALL")),
      security: score(field(result.summary || {}, "AVG_SECURITY")),
    },
  };
}
