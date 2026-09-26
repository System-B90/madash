# CLAUDE.md — madash

Org-wide conventions (repo list, Hive-org boundary, package scopes, git workflow, commit
format, CI secrets) live in
[System-B90/.github CLAUDE.md](https://github.com/System-B90/.github/blob/main/CLAUDE.md).
This file covers what's specific to madash.

## What madash is

**MADASH** is a Hebrew, right-to-left status/dashboard web app for the school. It surfaces:

- a live **journal**
- a **call-to-Hadas** board (calling students/groups, tracking their status)
- a **system status board** (Hive health, Madash link status)

It reads organizational data (students, classes) from the external **Hive** service, which
also provides SSO. See [`docs/architecture.md`](docs/architecture.md) for the full breakdown.

**madash is intentionally stateless — there is no database.** All server-side state lives
in-process and is lost on restart. Don't add persistence without understanding why that's
a deliberate design choice (see the architecture doc).

## Tech stack

Next.js 16 (App Router, React 19) · TypeScript · MUI v7 (RTL) · next-auth (Hive SSO) ·
WebSocket session server (`@system-b90/session-ws`) · Docker Compose · Playwright + Vitest.

## Architecture

```
Browser → src/api-client (fetch) → src/app/api (routes) → src/api-server (Hive client + in-memory state)
                                 src/api-shared (types & contracts shared by both ends)
```

Same layered client/server split as bluz: `api-client` is browser-only (no secrets),
`api-server` is server-only (Hive calls, in-memory state), `api-shared` holds types/pure
utils used by both. Don't cross the boundary — no DB queries here since there's no DB.

## Release bundles

Built by the shared sb90-deploy (System-B90/deploy-py, org `craft-release` action) from
`deploy/app.json` — add bundle files there, not in `release.yml`. The bundle's
compose file is `deploy/docker-compose.release.yml` (images only, `.env` beside it),
never the dev `deploy/docker-compose.yml`.

## Run locally

Route `madash.dev` to `127.0.0.8` in your hosts file, then:

```bash
python scripts/setup.py
npm install
npm run dev            # Local Next.js dev server + Dockerized proxy
```

WebSocket session server runs as a separate process:

```bash
npm run session:dev    # or npm run session:start for a production-like run
```

After changing Nginx/proxy config: `npm run proxy:up`.

Full Docker stacks: `npm run docker:dev` (hot-reload) / `npm run docker:prod`.

## Tests

```bash
npm run lint            # ESLint (lint:fix to autofix)
npm run test            # Full pipeline: unit + e2e
npm run test:unit       # Vitest only
npm run test:e2e        # Playwright e2e
npm run test:e2e:ui     # Playwright interactive UI runner
```

See [`tests/README.md`](tests/README.md) for the test suite's functionality map.

**Regression tests for bugs:** Every closed bug issue must have a dedicated regression test committed alongside the fix. The test must fail on the pre-fix code and pass after. This prevents bugs from silently resurfacing.

## Key directories

| Path              | Contains                                                       |
| ----------------- | -------------------------------------------------------------- |
| `src/api-client/` | Client-side fetch wrappers. Browser-only, no secrets.          |
| `src/app/api/`    | Next.js route handlers — thin controllers.                     |
| `src/api-server/` | Hive client + in-memory state. Server-only.                    |
| `src/api-shared/` | Shared types/contracts, pure utils. No side effects.           |
| `src/components/` | React UI: `journal`, `system-status-board`, `header`, `theme`. |
| `session-server/` | Standalone WebSocket server, own `package.json`.               |
| `scripts/`        | `setup.py` (on sb90-deploy) / `ci_setup.py` — env generation.  |
| `tests/`          | Vitest backend tests + Playwright e2e specs.                   |

## Environment variables

Root `.env`, generated via `scripts/setup.py` / `scripts/ci_setup.py`. Notable ones:

| Variable                                                                                                     | Purpose                                  |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `NEXT_PUBLIC_HIVE_URL`, `HIVE_CLIENT_ID`, `HIVE_CLIENT_SECRET`                                               | Hive + SSO                               |
| `HIVE_URL`                                                                                                   | Server-side Hive base URL (avatar proxy) |
| `HIVE_PROMETHEUS_URL`, `HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD`                                            | Hive infra health monitoring             |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, `SYM_ENC_KEY`                                               | Auth & session crypto                    |
| `WEBSOCKET_SESSION_SERVER_HOST`, `WEBSOCKET_SESSION_SERVER_PORT`, `WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY` | WebSocket session server                 |

`NEXT_PUBLIC_*` vars are exposed to the browser — never put secrets behind that prefix.

## Gotchas

- **No database.** If a task seems to need persistence, that's a sign to re-check the
  design intent (see `docs/architecture.md`) before adding one — madash's statelessness
  is deliberate, not an oversight.
- **RTL-first**, same as bluz: use logical CSS properties (`marginInlineStart`/`marginInlineEnd`),
  not `marginLeft`/`marginRight`. Hebrew strings in components/tests are intentional — don't
  translate them.
- Only `master` exists as a long-lived branch here (no `dev`, unlike bluz) — branch off
  `master`, PR back into `master`.
