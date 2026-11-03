# CAELUM Admin Console

Operations console for CAELUM, the regional blood-transfer network. Admins use it to watch
facilities, stock, requests, donor offers, transfers, couriers, custody, cold chain, forecasts
and the hash-chained audit log.

The console is a static React app. **It talks only to the CAELUM API** (`CAELUM_API`, contract
`docs/API_CONTRACT.md` v1.2.0) with a Supabase Auth JWT for an `admin` user. It never reads
or writes Supabase tables directly. All server logic, the database schema and migrations live in
**CAELUM_API**; this repo has no backend of its own.

Production API: `https://caelum-api.onrender.com` (Render, API v1.2.3), with Supabase Auth on project `qvqkxuaslayxvjgamtil`.

## Features

| Section | What it shows | API |
|---|---|---|
| Overview | Counts for requests, offers, transfers, couriers, alerts; audit chain status; live feed | `/admin/overview`, `/admin/feed` |
| Live Map | Facilities, active transfer routes and latest courier positions (Leaflet + OSM tiles) | `/admin/map` |
| Facilities | List by region, detail, contacts editing, inventory with logged corrections, forecast with history, facility audit | `/facilities`, `PATCH /facilities/{id}`, `/inventory`, `/audit?action=inventory.corrected`, `/forecast`, `/forecast/history`, `/facilities/{id}/audit` |
| Shortage Alerts | Open alerts; run forecast for all facilities; run timeout sweep | `/alerts`, `/forecast/run`, `/admin/jobs/sweep` |
| Requests | Request state machine (suggested → open → offered → matched → fulfilled), candidates, offers | `/requests/*` |
| Offers | Offer state machine with hold/accept/decline and expiry countdowns | `/offers/*` |
| Transfers | Stage timeline, pack/courier-accept deadlines, units, assign courier, cancel; custody (QR status and expiry, seal check, events, photos via signed links), cold-chain readings against bands, live tracking, transfer audit | `/transfers/*`, `/cold-chain/bands` |
| Couriers | Profiles, licence fields (expired flag), create/edit, recent positions, job history (derived, see gaps) | `/couriers`, `/couriers/{id}/locations`, `/transfers` |
| Audit Log | Filtered, paged global log and chain verification | `/audit`, `/audit/verify` |
| System | Root and v1 health, version, signed-in user, bands, decline reasons | `/health`, `/api/v1/health`, `/me` |

Known API gaps and how the console handles them: [`docs/CONTRACT_GAPS.md`](docs/CONTRACT_GAPS.md).

## Setup

Requirements: Node 20+ and a running CAELUM API (see its README; locally `python main.py` on
`http://localhost:5000`).

```bash
cd frontend
cp .env.example .env.local   # fill in real values; never commit them
npm install
npm run dev                  # http://localhost:5173 (allowed by the API's CORS defaults)
```

Scripts:

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm test` | Vitest (jsdom, all API calls mocked) |
| `npm run coverage` | Vitest with v8 coverage |
| `npm run build` | Production build into `frontend/dist` |
| `npm run preview` | Serve the built app locally |

## Environment variables

All are read at build time (Vite only exposes `VITE_*`).

| Variable | Required | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | yes (prod) | Origin of the CAELUM API, e.g. `https://caelum-api.onrender.com`. `/api/v1` is added for you; a value already ending in `/api` or `/api/v1` is accepted. Dev builds fall back to `http://localhost:5000` when empty; **production builds have no fallback** and show a "not configured" error. |
| `VITE_SUPABASE_URL` | yes | Supabase project URL, used for Auth only: `https://qvqkxuaslayxvjgamtil.supabase.co`. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable key (`sb_publishable_…`, public), used for Auth only. The legacy `VITE_SUPABASE_ANON_KEY` is still read as a fallback. |
| `VITE_DEMO_MODE` | no | `true` shows a "Use demo admin" button that only fills in `admin@caelum.demo`; the user still types the password, and sign-in goes through Supabase like any other account. No passwords are embedded. Leave `false` for production. |

## Deploying to Vercel

1. Import the repo, set **Root Directory** to `frontend`. Framework preset: Vite
   (build `npm run build`, output `dist`).
2. In Project → Settings → Environment Variables, set for Production (and Preview as needed):
   - `VITE_API_BASE_URL` = `https://caelum-api.onrender.com` (the origin only; the console adds `/api/v1`)
   - `VITE_SUPABASE_URL` = `https://qvqkxuaslayxvjgamtil.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable__zef25WCODbHoGHVOORnhQ_IS5Ue54a`
   - `VITE_DEMO_MODE` = `false` (or `true` on a demo deployment only)
3. Add the console's Vercel domain to `CORS_ORIGINS` on the Render API service. Until that is done the browser blocks the console's API calls (see `docs/CONTRACT_GAPS.md`).
4. Redeploy after changing any variable; values are baked in at build time.

## Architecture

```
frontend/src
├── main.jsx              AuthProvider + App
├── App.jsx               Auth gate and console shell (navbar, sidebar, sections)
├── auth/AuthContext.jsx  Supabase password sign-in; checks /me role=admin; signs out on 401
├── lib/
│   ├── config.js         Reads VITE_* (no localhost fallback outside dev)
│   ├── supabase.js       Supabase client for Auth only (null when not configured)
│   ├── api/client.js     fetch wrapper: base URL, bearer token, {data, meta} envelope, ApiError, 401 hook
│   ├── api/*.js          One module per API area (facilities, inventory, requests, offers, transfers, custody, couriers, admin, …)
│   └── format.js         Times shown in Africa/Nairobi (EAT)
├── hooks/                useApiData (load, poll, reload), useNow, useFacilityNames
├── components/           Shared UI, Leaflet map, audit list, facility and transfer panels
└── pages/                One page per section
```

- **Auth.** Password sign-in goes through Supabase Auth; the access token is sent as
  `Authorization: Bearer …` (supabase-js refreshes it). There is no API-issued demo token any more.
  The console calls `/me` and only lets `role: admin` in. Any `401` from the API
  signs the user out with a "session expired" message.
- **Errors.** API errors (`{error:{code,message,details}}`) become `ApiError` with `status`,
  `code`, `details` and, for `429`, `retryAfter`. Network failures surface as `network_error`.
- **Tests.** `vitest` with Testing Library; `fetch` and the API client are mocked, so tests
  never reach a live host.

## Repository layout

- `frontend/` — this console.
- Server code lives in the separate **CAELUM_API** repo.
- `docs/` — contract gaps and project notes.
