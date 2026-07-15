# MADASH

**MADASH** is a Hebrew, right-to-left status/dashboard web app for an
educational institution ("Bis"). It surfaces a live journal, a call-to-Hadas
board (calling students/groups and tracking their status), and a system
status board (Hive health, Madash link status). It reads organizational data
(students, classes) from an external **Hive** service that also provides SSO.

MADASH is intentionally **volatile / stateless** — there is no database.
All server-side state lives in-process and is lost on restart. See
[`docs/architecture.md`](docs/architecture.md) for details and the reasoning
behind that design.

## Tech stack

Next.js 16 (App Router, React 19) · TypeScript · MUI v7 (RTL) · next-auth ·
WebSocket session server · Docker Compose · Playwright + Vitest.

## Architecture at a glance

```
Browser → src/api-client (fetch) → src/app/api (routes) → src/api-server (Hive/state)
                                 src/api-shared (types & contracts shared by both ends)
```

See [`docs/architecture.md`](docs/architecture.md) for the full breakdown,
including the in-memory state model.

## Environment variables

Runtime config comes from the root `.env` (see `scripts/setup.py` /
`scripts/ci_setup.py` for how it's generated locally/in CI). Notable ones:

- `NEXT_PUBLIC_HIVE_URL`, `HIVE_CLIENT_ID`, `HIVE_CLIENT_SECRET` — Hive + SSO
- `HIVE_URL` — server-side Hive base URL (avatar proxy)
- `HIVE_PROMETHEUS_URL`, `HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD` — optional Hive infra health monitoring
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, `SYM_ENC_KEY` — auth & session crypto
- `WEBSOCKET_SESSION_SERVER_HOST`, `WEBSOCKET_SESSION_SERVER_PORT`, `WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY` — WebSocket session server

## Dependencies

- A **Hive** instance (org data + SSO). No database is required.

## Dev setup

Route `madash.bis` to `127.0.0.3` in your hosts file, then:

```bash
python setup.py
npm install
npm run dev            # Local Next.js dev server + Dockerized proxy
```

The WebSocket session server runs as a separate process:

```bash
npm run session:dev    # or npm run session:start for a production-like run
```

### After updating Nginx / proxy settings

```bash
npm run proxy:up
```

## Common commands

```bash
npm run dev            # Local Next.js dev server + Dockerized proxy
npm run lint           # ESLint (lint:fix to autofix)
npm run test           # Full test pipeline (unit + e2e)
npm run test:unit      # Vitest only
npm run test:e2e       # Playwright e2e (npm run test:e2e:ui for the UI runner)
npm run docker:dev     # Full dev stack in Docker (hot-reload)
npm run docker:prod    # Full prod stack in Docker
```

## Project layout

| Directory             | Role                                                   |
| --------------------- | ------------------------------------------------------ |
| `src/api-client`      | Client-side fetch wrappers                             |
| `src/app/api`         | Next.js route handlers                                 |
| `src/api-server`      | Server-side state & Hive client                        |
| `src/api-shared`      | Shared types & contracts                               |
| `src/components`      | React UI (journal, system-status-board, header, theme) |
| `session-server/`     | Standalone WebSocket server for real-time updates      |
| `scripts/` · `tests/` | Tooling, CI setup, and the test suite                  |

See [`tests/README.md`](tests/README.md) for the test suite's functionality map.
