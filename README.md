# Kasatria 3D Periodic Table — Software Developer Assignment

A 3D data visualization built on the Three.js **CSS3DRenderer**, adapted from the
official [css3d_periodictable](https://threejs.org/examples/#css3d_periodictable)
example. 200 people from a Google Sheet are rendered as tiles, color-coded by
net worth, and arranged in four animated layouts.

**Live demo:** `<YOUR_DEPLOYED_URL_HERE>`

## Features

- **Google Sign-In gate** (Google Identity Services) — the visualization only loads after authentication; signed-in user's name and avatar shown with a sign-out option
- **Live data from Google Sheets** (Sheets API v4, read-only, API-key access)
- **Tile design per spec:** country (top-left), rank (top-right), photo (center), name and interest (bottom)
- **Net worth color tiers:** Red < $100K · Orange $100K–$200K · Green > $200K, plus a LOW→HIGH legend
- **Four layouts:** Table (20×10), Sphere, **double** Helix, Grid (5×4×10) with tweened transitions
- Loading spinner, descriptive error states with retry, broken-image fallback, responsive UI

## Architecture

```
index.html        UI shell: login gate, menu, legend, status overlays
css/style.css     Demo-faithful dark aesthetic + tier colors
js/config.js      All environment values in one place (keys, sheet ID, thresholds)
js/auth.js        GIS login flow, JWT payload decode (display only), sign-out
js/data.js        Sheets API fetch, header-tolerant parsing, net worth tiering
js/main.js        Three.js scene, tile factory, layout math, TWEEN transitions
```

Plain ES modules, no build step — deployable to any static host.

## Layout math

**Table (20×10):** `col = i % 20`, `row = floor(i / 20)`, with pitch 140×180px
and offsets that center the grid at the origin.

**Sphere:** golden-spiral distribution — `phi = acos(-1 + 2i/n)` spaces points
evenly along the vertical axis; `theta = sqrt(n·π)·phi` spirals them around it.
Each tile `lookAt`s a point radially outward so it faces away from center.

**Double helix:** tiles alternate between two strands (`strand = i % 2`). Both
strands share the same angular step (`idx · 0.30` rad) and vertical drop
(14px/step), but the second strand's angle is offset by **π (180°)** so it
winds exactly opposite the first — the classic DNA silhouette.
`setFromCylindricalCoords(800, θ, y)` places tiles on the cylinder surface.

**Grid (5×4×10):** index decomposition with mixed radix —
`x = i % 5`, `y = floor(i/5) % 4`, `z = floor(i/20)`.
5 × 4 × 10 = 200 slots = exactly the dataset size.

## Setup

### 1. Google Sheet
1. Create a sheet, **File → Import** the provided CSV.
2. Share → *Anyone with the link: Viewer*, and share with `lisa@kasatria.com`.
3. Copy the sheet ID from the URL into `js/config.js` → `SHEET_ID`.

### 2. Google Cloud project
1. [console.cloud.google.com](https://console.cloud.google.com) → New project.
2. **APIs & Services → Library** → enable *Google Sheets API*.
3. **Credentials → Create credentials → API key** → restrict it to the Sheets
   API and to your site (HTTP referrers). → `SHEETS_API_KEY`.
4. **OAuth consent screen** → External → fill app name + support email → add
   yourself as a test user (or publish).
5. **Credentials → Create credentials → OAuth client ID → Web application** →
   add **Authorized JavaScript origins**:
   - `http://localhost:5500` (local dev)
   - your production origin, e.g. `https://<user>.github.io`
   → `GOOGLE_CLIENT_ID`.

### 3. Run locally
GIS requires an http(s) origin (not `file://`):

```bash
npx serve .        # or: python3 -m http.server 5500
```

### 4. Deploy (GitHub Pages)
```bash
git init && git add . && git commit -m "feat: initial release"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```
Repo → Settings → Pages → Deploy from branch → `main` / root.
Then add the resulting origin to the OAuth client's authorized origins.

## Assumptions & trade-offs

- The spec lists Orange **>** $100K and Green **>** $200K; boundaries are
  resolved as Red < 100K, Orange [100K, 200K], Green > 200K.
- The CSV's ` Net Worth ` header contains stray spaces; headers are trimmed at
  parse time so the sheet never needs manual editing.
- API key + client ID are public-by-design identifiers for client-side apps;
  protection comes from referrer/origin restrictions in Google Cloud Console.
- No framework/build step: the assignment is an adaptation of a vanilla
  Three.js demo, so vanilla ES modules keep it faithful and easy to review.
