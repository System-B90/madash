# MADASH

**MADASH** ("Bis Madash") is a Hebrew, right-to-left **status/dashboard** web app for an
educational institution. It surfaces a live journal, a call-to-Hadas board (calling
students/groups and tracking their status), and a system status board (Hive health,
Madash link status), reading organizational data (students, classes) from an external
**Hive** service that also provides SSO.

MADASH is intentionally **volatile / stateless** — there is no database. All server-side
state lives in-process and is lost on restart; [`docs/architecture.md`](docs/architecture.md)
has the reasoning.

---

## Quick start

Point `madash.dev` at `127.0.0.8` in your hosts file, then:

```bash
pip install -r scripts/requirements.txt
python scripts/setup.py     # interactive: writes .env and registers Hive SSO
npm install
python tools.py dev         # backgrounds Next.js + the WebSocket server, returns
python tools.py dev status  # what is actually up
```

`tools.py` is the dev-ops CLI for the rest:

```bash
python tools.py dev stop
python tools.py lint --fix
python tools.py docker down
python tools.py --help
```

The only thing MADASH needs to run is a reachable **Hive** instance — no database.

Changed `nginx.conf`? `npm run proxy:up`.

### npm scripts

`tools.py` wraps these; reach for them directly when you want one in the foreground.

```bash
npm run dev            # Next.js dev server + Dockerized proxy
npm run session:dev    # WebSocket session server (session:start for production-like)
npm run lint           # ESLint (lint:fix to autofix)
npm run test:unit      # Vitest
npm run test:e2e       # Playwright (test:e2e:ui for the UI runner)
npm run docker:dev     # Full dev stack in Docker (hot-reload)
```

`docker:dev` runs `ui` (Next dev server), `sessions` and the proxy in Docker with source
synced into the containers (`docker compose watch`; `package.json` changes trigger a
rebuild). It serves on `127.0.0.8` (override with `MADASH_PROXY_BIND_IP`), needs
`ssl/cert.pem` + `ssl/key.pem` from `python setup.py`, `NPM_TOKEN` in the environment
or `.env`, and a running Hive stack: `ui` joins Hive's Docker network so `hive.org`
resolves in-container (`HIVE_NETWORK_NAME`, default `hive-stack_hive-net`). Don't run it
alongside `npm run dev` � both bind the same proxy ports.

---

## What it does

- **Journal** — live, running record of the day's status/events.
- **Call-to-Hadas board** — call students/groups and track their status in real time.
- **System status board** — Hive health and Madash link status at a glance.
- **Hive SSO** — authentication and shared org data through the external Hive microservice.

## Going deeper

**[CLAUDE.md](CLAUDE.md)** is the reference: the layered API design
(`api-client` → `app/api` → `api-server`, with `api-shared` between the ends), the
directory map, conventions, and every command in one place. Read it before making a
change here — whether you are a person or an agent.

- Architecture and the in-memory state model → [`docs/architecture.md`](docs/architecture.md)
- Environment variables → [CLAUDE.md](CLAUDE.md); `.env` is written by `scripts/setup.py`
  locally and `scripts/ci_setup.py` in CI
- Test suite and its functionality map → [`tests/README.md`](tests/README.md)
