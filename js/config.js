/**
 * config.js
 * Single source of truth for all environment-specific values.
 * Replace the placeholders below before deploying.
 *
 * NOTE: API keys and OAuth Client IDs are *public* identifiers by design
 * for client-side apps. Security comes from restricting them in the
 * Google Cloud Console (HTTP referrer restrictions + authorized origins).
 */
window.APP_CONFIG = {
  // OAuth 2.0 Client ID (Web application) from Google Cloud Console
  GOOGLE_CLIENT_ID: "814809139964-72bl23qt9jnb4b6h453bmt80dnh7ggrv.apps.googleusercontent.com",

  // API key restricted to the Google Sheets API + your domains
  SHEETS_API_KEY: "AIzaSyBumT_6L3SHBhgvpgzD2zQFTdmYhw7y2ZY",

  // The ID from your sheet URL:
  // https://docs.google.com/spreadsheets/d/<THIS_PART>/edit
  SHEET_ID: "1pipkgnOT7ATYyQscUCK2sAsapNSlrEs2B5FVXbi32_4",

  // Tab name + range. A1:F201 = header row + 200 data rows, 6 columns.
  SHEET_RANGE: "Sheet1!A1:F201",

  // Net worth color thresholds (USD).
  // Red < 100K, Orange 100K–200K, Green > 200K (per assignment spec).
  NET_WORTH_TIERS: {
    ORANGE_MIN: 100_000,
    GREEN_MIN: 200_000,
  },

  // Set true ONLY for local layout work without Google login.
  // Must be false in the deployed build.
  SKIP_AUTH: false,
};
