# AGENTS.md

## Repository layout

Two independent packages, no monorepo tooling:

- **`ruta-cero-back/`** — Node.js + Express 5 API (ES Modules, `"type": "module"`)
- **`ruta-cero-front/`** — Angular 21 app with SSR (Signals, standalone components, Leaflet)

Each package has its own `package.json` and `node_modules`. Run commands from inside the relevant package directory.

## Commands

### Backend (`ruta-cero-back/`)
```bash
npm run dev                          # Start server with Nodemon (http://localhost:3000)
npm run migrate:places-cache         # Create Google Places cache tables
npm run migrate:overpass-cache       # Create Overpass cache table
node src/repositories/etl.js         # Run ETL: extract from OpenStreetMap → PostgreSQL
```

### Frontend (`ruta-cero-front/`)
```bash
npm start            # ng serve with proxy to localhost:3000 (http://localhost:4200)
npm test             # Vitest (smoke tests only)
npm run build        # ng build (output: dist/)
```

There are no `lint` or `typecheck` scripts defined in either package.

## Architecture

### Backend: Layered (Routes → Controller → Service → Repository)

5 route groups, all protected by JWT `authenticateToken` middleware except `/api/auth`:

- `src/routes/auth.routes.js` — POST `/api/auth/login`, `/api/auth/register` (public)
- `src/routes/chat.routes.js` — POST `/api/chat` (main chat endpoint)
- `src/routes/perfil.routes.js` — user profile/preferences
- `src/routes/places.routes.js` — places browsing
- `src/routes/admin.routes.js` — admin operations (`verifyAdmin` middleware)
- `src/middleware/auth.middleware.js` — `authenticateToken`, `verifyAdmin`, `optionalAuth`

Chat flow: `chat.controller.js` → `ai.service.js` → `db.js` (PostGIS) + Gemini.

Root-level `escaner.js` and `radar.js` are standalone utility scripts to discover available Gemini models.

### Frontend: Angular SSR + Signals

- **SSR enabled** with prerender mode (`app.routes.server.ts`). Route `itinerario/:id` is `RenderMode.Client`; everything else is `RenderMode.Prerender`.
- **State:** `src/app/services/store.ts` — signal-based store (no NgRx/NGXS).
- **Auth:** JWT-based via `auth.service.ts`, `auth.guard.ts`, `auth.interceptor.ts` (auto-injects Bearer token).
- **API proxy:** `proxy.conf.json` forwards `/api` → `localhost:3000` in dev only.
- **Leaflet** loaded dynamically via `import('leaflet')` gated behind `isPlatformBrowser` in `mapa.ts`.

## Critical conventions

### API contract
All chat responses **must** return `{ respuesta: string, lugaresFisicos: Array }`. The frontend depends on both fields. Never return text-only.

### Chat controller: category detection + RAG
The intent classifier (`detectarCategoria()`) matches user messages against regex patterns for 8 categories (Cafeteria, Gastronomia, Cultura, Parques, Miradores, Entretenimiento, Centros Comerciales, Vida Nocturna). Returns `null` for unmatched messages. **All queries go through Gemini** — the category hint only narrows the PostGIS retrieval. There is no SQL-only path.

### Gemini usage rules
- Model: `gemini-flash-lite-latest` (alias auto-updates with Google deprecations).
- Google Search Grounding is enabled but **only for weather/hours confirmation**. Never let Gemini search for local place info — it must use the DB-injected strings to avoid hallucinations.
- History truncated to last 6 turns (`MAX_TURNOS_HISTORIAL`).
- Post-processing: `separarRespuestaYRecomendados()` parses a `LUGARES_RECOMENDADOS:` suffix from Gemini's output and cross-references against DB results to produce `lugaresFisicos`.

### PostGIS queries
Use geographic functions exclusively:
```sql
ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, meters)
```
Note: MakePoint takes `(lng, lat)`, not `(lat, lng)`.

### ETL quality filter
Places scoring below 50 points are discarded during ingestion. Do not remove this threshold.

### Connection cleanup
Standalone scripts (`etl.js`) must call `pool.end()` in their `finally` blocks.

## Frontend conventions

- **Component prefix:** `app`
- **Standalone components** — no NgModules
- **Prettier** (in `package.json`): single quotes, 100 char width, `angular` parser for HTML
- **TypeScript strict mode** fully enabled (`strict: true`, `strictTemplates`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`)
- **Leaflet** loaded via dynamic `import()` only in browser context — never import statically in components that run during SSR

## Environment

Backend `.env` (not committed) requires:
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
- `GEMINI_API_KEY`
- `PORT` (default: 3000)

## Don'ts

- Don't commit `.env` files (DB credentials + API keys)
- Don't use `require()` — both packages use ES module imports
- Don't hardcode Gemini model names without checking `escaner.js` output first
- Don't remove the ETL quality threshold (< 50 points = discard)
- Don't import Leaflet at module level — it needs the DOM and breaks SSR
- Don't let Gemini use Google Search for local place data — it must use DB-injected strings
