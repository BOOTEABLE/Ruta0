# AGENTS.md

## Repository layout

Two independent packages, no monorepo tooling:

- **`ruta-cero-back/`** — Node.js + Express 5 API (ES Modules, `"type": "module"`)
- **`ruta-cero-front/`** — Angular 21 app with SSR (Signals, standalone components, Leaflet)

Each package has its own `package.json` and `node_modules`. Run commands from inside the relevant package directory.

## Commands

### Backend (`ruta-cero-back/`)
```bash
npm run dev          # Start server with Nodemon (http://localhost:3000)
node src/repositories/etl.js    # Run ETL: extract from OpenStreetMap → PostgreSQL
node src/repositories/setup.js  # DROPS and recreates the `lugares` table (destructive!)
```

### Frontend (`ruta-cero-front/`)
```bash
npm start            # ng serve (http://localhost:4200)
npm test             # ng test (Vitest)
npm run build        # ng build (output: dist/)
```

There are no `lint` or `typecheck` scripts defined in either package.

## Architecture

### Backend: Layered (Routes → Controller → Service → Repository)

- `src/routes/chat.routes.js` — single POST `/api/chat` endpoint
- `src/controllers/chat.controller.js` — "El Semáforo": classifies user intent, routes to SQL or Gemini
- `src/services/ai.service.js` — Gemini via `@google/genai` SDK (model: `gemini-flash-latest`) with Google Search Grounding
- `src/repositories/db.js` — PostgreSQL connection pool (`pg`)
- `src/repositories/etl.js` — OpenStreetMap → PostgreSQL ingestion pipeline
- `src/repositories/setup.js` — DB schema bootstrap (drops + recreates table)

`ruta-cero-back/escaner.js` and `ruta-cero-back/radar.js` are standalone utility scripts to discover available Gemini models.

### Frontend: Angular SSR + Signals

- **SSR enabled** with prerender mode (`app.routes.server.ts`). Leaflet loads dynamically only in browser (`isPlatformBrowser` guard in `mapa.ts`).
- **State:** `src/app/services/store.ts` — signal-based store (no NgRx/NGXS).
- **Components:** `dashboard` (layout), `mapa` (Leaflet map), `panel-lateral` (chat + place details).
- Frontend hits backend at hardcoded `http://localhost:3000/api/chat` in `panel-lateral.ts`.

## Critical conventions

### API contract
All chat responses (from both the SQL path and the Gemini path) **must** return `{ respuesta: string, lugaresFisicos: Array }`. The frontend depends on both fields. Never return text-only.

### PostGIS queries
Use geographic functions exclusively:
```sql
ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, meters)
```
Note: MakePoint takes `(lng, lat)`, not `(lat, lng)`.

### Intent classifier ("El Semáforo")
Keyword-based routing in `clasificarIntencion()`:
- **GEMINI** path: complex queries (budget, weather, recommendations, itineraries)
- **POSTGRESQL** path: simple category lookups (costs 0 tokens)

### Gemini usage rules
- Google Search Grounding is enabled but **only for weather data**. Never let Gemini search for local place info — it must use the DB-injected strings to avoid hallucinations.

### ETL quality filter
Places scoring below 50 points are discarded during ingestion. Do not remove this threshold.

### Connection cleanup
Standalone scripts (`etl.js`, `setup.js`) must call `pool.end()` in their `finally` blocks.

## Frontend conventions

- **Component prefix:** `app`
- **Standalone components** — no NgModules
- **Prettier** (in `package.json`): single quotes, 100 char width, `angular` parser for HTML
- **TypeScript strict mode** enabled with `strictTemplates` and `noImplicitReturns`
- **Leaflet** loaded via dynamic `import()` only in browser context — never import statically in components that run during SSR

## Environment

Backend `.env` (not committed) requires:
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
- `GEMINI_API_KEY`
- `PORT` (default: 3000)

## Don'ts

- Don't commit `.env` files (DB credentials + API keys)
- Don't use `require()` — both packages use ES module imports
- Don't hardcode specific Gemini model versions — use `gemini-flash-latest` alias in `ai.service.js` to avoid deprecation breakage
- Don't let the `setup.js` schema script run in production (it drops the table)
- Don't import Leaflet at module level — it needs the DOM and breaks SSR
