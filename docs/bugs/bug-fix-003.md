# bug-fix-003: Production server does not exit on SIGTERM

| | |
|---|---|
| Status | Fixed (PR pending merge) |
| Reported | 10.11.2026 (found while verifying bug-fix-002) |
| Branch / commit | main @ 0874de2 |
| Area | Production server (`node build`, Docker), `src/hooks.server.ts` |

## Cause message
> Side observation of the bug-fix-002 agent: `node build` does not exit on SIGTERM; stayed alive > 2 minutes, had to use SIGKILL. Could make `docker stop` slow.

## Verification
- Verdict: **EXISTS**
- Steps: fresh DB → `pnpm build` → `DATABASE_URL=… PORT=3000 node build` → one GET request → `kill -TERM <pid>`
- Observed: process still alive after 45 s (adapter-node `SHUTDOWN_TIMEOUT` is 30 s); only SIGKILL ends it. In Docker, `docker stop` waits 10 s and then kills the container hard.

## Cause
- adapter-node handles SIGTERM/SIGINT (`build/server/adapter-index.js:57-70`): closes the HTTP server, then emits `process` event `sveltekit:shutdown` and expects the app to release its own resources.
- `src/lib/server/db/index.ts`: the postgres.js pool (`max: 5`) is never closed → its open sockets keep the Node event loop alive.

## Proposed fix
Close the pool on `sveltekit:shutdown` (the documented adapter-node hook for cleanup): `closeOnShutdown(process, client)` in `src/lib/server/db/shutdown.ts`, registered in the `init` hook; `client.end({ timeout: 5 })` lets running queries finish for at most 5 s.
Alternatives: `process.exit()` in a SIGTERM handler (cuts off running requests, bypasses the adapter's graceful shutdown) – rejected.

## Report
- Result: **Successful** – after SIGTERM the server finishes open requests, closes the DB pool and exits.
- Verified:
  - 2 new unit tests in `src/lib/server/db/shutdown.test.ts` – failed before (module missing), pass after; 73/73 tests
  - `pnpm check` 0 errors, `pnpm build` OK
  - Reproduction re-run: `node build` + GET + SIGTERM → process exits after ~2 s (before: alive after 45 s)
- PR: https://github.com/SeronEffect/Gardenplaner/pull/7
- Open points: none. Independent of PR #6 (bug-fix-002), can be merged in any order.
