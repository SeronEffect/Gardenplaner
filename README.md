# Gardenplaner

Planning tool for a vegetable garden / allotment: beds and rows, crop rotation across years,
weekly garden calendar (pre-culture, sowing, planting out, fertilizing, harvest, aftercare),
plant cards, bed history, succession sowing, green manure, shopping list.
Later: weather data (Open-Meteo) and sensors (temperature, humidity, light).

UI language: German. Code: English. Spec: [docs/P0-Spezifikation.md](docs/P0-Spezifikation.md).

## Status

| Phase | Content | Status |
|---|---|---|
| P0 | Spec, data model, wireframes | ✅ |
| P1 | Plant database + plant cards | ✅ |
| P2 | Beds, rows, seasons, history | ✅ |
| P3 | Tasks + weekly calendar | ✅ |
| P4 | Rotation, neighbours, succession, green manure | ✅ |
| P5 | Suggestions, shopping list, diary | ✅ |
| P6 | Login, PWA/offline, garden mode (done) · online hosting (open) | 🔶 |
| P7 | Weather + sensors | – |

## Stack

SvelteKit 3 (TypeScript, Svelte 5) · Drizzle ORM · PostgreSQL 16 · Docker · Vitest

## Getting started

Requirements: Node ≥ 22.17, pnpm (`corepack enable`), Docker.

```bash
cp .env.example .env          # set POSTGRES_PASSWORD and the same password in DATABASE_URL
docker compose up -d db       # Postgres on localhost:5432
pnpm install
pnpm dev                      # http://localhost:5173 – applies migrations + plant data on start
pnpm images:fetch             # optional: plant pictures from Wikimedia Commons (needs internet)
```

Run everything in Docker instead: `docker compose up -d --build` → http://localhost:3000

### Login

Without a password the app is open (fine on your own machine; a banner reminds you). Before putting it
online, set one **on the server** – there is deliberately no way to set it through the web page:

```bash
pnpm passwort                 # asks twice, min. 10 characters; --entfernen removes it again
# in Docker:
docker compose exec app node --experimental-strip-types scripts/set-password.ts
```

Changing the password logs out every device. On the phone, open the app and "Zum Startbildschirm hinzufügen" –
it starts in the garden mode (`/garten`) and shows the last loaded pages offline.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (loads `.env`) |
| `pnpm passwort [--entfernen]` | Set or remove the login password |
| `pnpm test` | Unit tests (date logic, plant data consistency, picture lookup) |
| `pnpm check` | Type check |
| `pnpm build` / `pnpm start` | Production build / run it |
| `pnpm db:generate` | Create a migration after changing `src/lib/server/db/schema.ts` |
| `pnpm db:studio` | Browse the database |
| `pnpm images:fetch [--force]` | Look up plant pictures (author + licence are stored for the credit line) |

## Project layout

```
src/lib/data/plants.ts      plant reference data with sources (spec §5)
src/lib/data/sources.ts     source registry (BZfE, BUND, …)
src/lib/rules/timeline.ts   date logic: culture steps → date windows, year strip
src/lib/server/db/          schema, connection, seeding
src/routes/pflanzen/        plant library + plant card
src/routes/gartenplan/      garden map, beds, rows, history
src/lib/rules/space.ts      space rules for rows (fit, overlap, next free position)
src/lib/rules/tasks.ts      task generation from plantings (spec §4.4)
src/routes/kalender/        weekly calendar · src/routes/+page.svelte overview
scripts/                    picture lookup (Wikimedia)
drizzle/                    SQL migrations
```

Plant data lives in code (`plants.ts`) and is written to the database on every server start,
so corrections are a normal code change. Pictures fetched once are kept.

## License

MIT – see [LICENSE](LICENSE). Plant pictures: Wikimedia Commons, licence and author shown on each card.
