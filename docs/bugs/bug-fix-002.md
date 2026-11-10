# bug-fix-002: Form POSTs return 403 in the production build

| | |
|---|---|
| Status | Fixed (PR pending merge) |
| Reported | 06.11.2026 (Projektstand §6), fixed 10.11.2026 |
| Branch / commit | main @ 0874de2 |
| Area | Production build / Docker (`node build`), all form actions |

## Cause message
> Produktions-Build/Docker: Formular-POSTs über `http://localhost:3000` werden mit 403 („Cross-site POST form submissions are forbidden“) abgelehnt. adapter-node 6 liest `ORIGIN` nicht mehr.

## Verification (agent)
- Verdict: **EXISTS** (kit 3.1.1, adapter-node 6.0.1)
- Steps: fresh DB → `pnpm build` → `DATABASE_URL=… ORIGIN=http://localhost:3000 PORT=3000 node build` → `curl -X POST http://localhost:3000/gartenplan/beet/neu -H 'Origin: http://localhost:3000' -H 'Content-Type: application/x-www-form-urlencoded' --data 'name=Test&…'`
- Observed:
  - 403 `Cross-site POST form submissions are forbidden`; identical with and without `ORIGIN` → the variable is ignored.
  - With `Origin: https://localhost:3000` the check passes → the server believes it runs on **https**.
  - `pnpm dev`: no check at all (CSRF check only runs in production).
  - Side observation: `node build` does not exit on SIGTERM (→ separate ticket bug-fix-003).

## Cause
- adapter-node 6.0.0 removed the `ORIGIN` environment variable (CHANGELOG: “add `kit.paths.origin` config option … remove the adapter-node `ORIGIN` environment variable”). `docker-compose.yml:25` still sets it.
- `adapter-node/index.js:69` bakes `kit.paths.origin` into the build (`build/adapter-node.js`: `origin = undefined`).
- `adapter-node/src/handler.js:154-156`: without origin and without `PROTOCOL_HEADER` the protocol falls back to `'https'` → `url.origin = https://localhost:3000`.
- `kit/src/runtime/server/respond.js:101-128` + `csrf.js:37-44`: browser sends `Origin: http://localhost:3000` ≠ `https://localhost:3000` → 403.

## Proposed fix
Set the new build-time option `kit.paths.origin` (documented successor of `ORIGIN`) in `vite.config.ts`, read from `ORIGIN` **at build time** with default `http://localhost:3000`:
- `vite.config.ts`: `paths: { origin: process.env.ORIGIN || 'http://localhost:3000' }`
- `Dockerfile`: `ARG ORIGIN=http://localhost:3000` in the build stage; `docker-compose.yml`: pass `ORIGIN` as build arg instead of runtime env.
- `.env.example` / README: note that a different URL (hosting in P6) needs a rebuild with `ORIGIN=https://…`.

Alternatives: `csrf.trustedOrigins` (not honoured for remote functions, treats the symptom), `trustedOrigins: ['*']` (disables CSRF protection), `PROTOCOL_HEADER`/`HOST_HEADER` (only behind a reverse proxy – relevant again in P6).

## Report
- Result: **Successful** – the production build bakes in `kit.paths.origin` (default `http://localhost:3000`, overridable with `ORIGIN` at build time); same-origin form POSTs work again, the CSRF protection stays active.
- Changes: `scripts/origin.ts` (`appOrigin()` with validation), `vite.config.ts` (`paths.origin`), `Dockerfile` (`ARG ORIGIN`), `docker-compose.yml` (`ORIGIN` as build arg instead of runtime env), `package.json` (`pnpm build` reads `.env` like `pnpm dev`), `.env.example`.
- Verified:
  - 4 new unit tests in `scripts/origin.test.ts` (default, override, trailing slash, invalid values) – failed before (module missing), pass after; 75/75 tests
  - `pnpm check` 0 errors, `pnpm build` OK, `build/adapter-node.js` → `origin = "http://localhost:3000"`
  - Reproduction re-run on a fresh DB with `node build`: POST `/gartenplan/beet/neu` with `Origin: http://localhost:3000` → 200 (redirect), bed saved; `Origin: http://evil.example` → 403 (protection still active)
- PR: PR_LINK
- Open points:
  - Online hosting (P6): build with `ORIGIN=https://<domain>`; behind a reverse proxy additionally consider `PROTOCOL_HEADER`/`HOST_HEADER`.
  - `http://127.0.0.1:3000` is a different origin → use `localhost`.
  - `node build` does not exit on SIGTERM (Postgres pool keeps the process alive) → bug-fix-003.
