/**
 * data.js (ES module)
 * Fetches rows from Google Sheets API v4 and maps them to clean
 * person objects ready for the 3D layer.
 *
 * Endpoint:
 *   GET https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}?key={key}
 * Requires: sheet visibility "Anyone with the link – Viewer" and an API key
 * restricted to the Sheets API.
 */

const CFG = window.APP_CONFIG;

/**
 * Parse "$251,260.80" -> 251260.8
 * Tolerates currency symbols, commas, and whitespace.
 */
export function parseNetWorth(raw) {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^0-9.\-]/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Assignment spec: Red < $100K, Orange $100K–$200K, Green > $200K.
 * Boundary values fall into the lower tier (documented assumption).
 */
export function netWorthTier(value) {
  const { ORANGE_MIN, GREEN_MIN } = CFG.NET_WORTH_TIERS;
  if (value > GREEN_MIN) return "green";
  if (value >= ORANGE_MIN) return "orange";
  return "red";
}

/**
 * Map a header row to column indexes, trimming stray whitespace.
 * The provided CSV has " Net Worth " (padded) — this handles it safely
 * without requiring anyone to edit the sheet.
 */
function indexHeaders(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => {
    map[String(h).trim().toLowerCase()] = i;
  });
  return map;
}

/** Fetch + normalize all people. Throws a descriptive Error on failure. */
export async function fetchPeople() {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${CFG.SHEET_ID}` +
    `/values/${encodeURIComponent(CFG.SHEET_RANGE)}?key=${CFG.SHEETS_API_KEY}`;

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Network error — check your connection and try again.");
  }

  if (!response.ok) {
    const hint =
      response.status === 403
        ? "API key invalid/restricted, or the sheet is not shared publicly."
        : response.status === 404
        ? "Sheet ID or range not found — check config.js."
        : `Google Sheets API returned HTTP ${response.status}.`;
    throw new Error(hint);
  }

  const json = await response.json();
  const rows = json.values || [];
  if (rows.length < 2) {
    throw new Error("The sheet returned no data rows.");
  }

  const col = indexHeaders(rows[0]);
  const required = ["name", "photo", "country", "interest", "net worth"];
  for (const key of required) {
    if (!(key in col)) throw new Error(`Missing expected column: "${key}".`);
  }

  return rows.slice(1).map((row, i) => {
    const netWorth = parseNetWorth(row[col["net worth"]]);
    return {
      rank: i + 1, // 1-based position, shown top-right of each tile
      name: row[col["name"]] ?? "",
      photo: row[col["photo"]] ?? "",
      country: row[col["country"]] ?? "",
      interest: row[col["interest"]] ?? "",
      netWorth,
      tier: netWorthTier(netWorth),
    };
  });
}
