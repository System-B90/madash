# MADASH Test Suite

Two layers: Vitest unit tests against server-side logic (`tests/backend/`), and
Playwright end-to-end tests driving the real app + Hive SSO (`tests/*.spec.ts`).

---

## Unit tests (`tests/backend/`, Vitest)

| Test File                    | Covers                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `types.test.ts`              | Shared type helpers in `api-shared/types`                                                    |
| `errors.test.ts`             | `api-shared/errors` error class hierarchy                                                    |
| `datastore.test.ts`          | In-memory datastore (`api-server/datastore.ts`) — madrat text, call-to-Hadas CRUD/duplicates |
| `hive-client.test.ts`        | `HiveClient` — queries, 401 refresh-and-retry, 500 retry, token-cookie fetch                 |
| `sso.test.ts`                | `authOptions` callbacks — clearance gate (`signIn`), token exchange (`jwt`), session shaping |
| `common.test.ts`             | `catchHandler` error-to-response mapping, `ApiResponseMaker` cache-control branches          |
| `hive-prometheus.test.ts`    | `/api/status/hive-prometheus` — auth gate, unconfigured shortcut, probe branch matrix        |
| `session-ws-utils.test.ts`   | Server-side WS singleton (`api-server/web-socket-utils.ts`) — queueing, error/close resets   |
| `session-server.test.ts`     | Session-server dispatch logic (`session-server/session-dispatch.ts`) — auth, fan-out, GC     |
| `avatars-route.test.ts`      | `/api/avatars/[slug]` — auth gate, upstream error passthrough, success/failure paths         |
| `providers-reducers.test.ts` | `studentsReducer` / `calledEntitiesReducer` state transitions                                |

Run with `npm run test:unit` (`vitest run --config tests/vitest.config.ts`).
Environment is plain Node (no DOM) — component/hook tests are limited to
exported pure logic (reducers, utility functions), not full render trees.

---

## End-to-end tests (`tests/*.spec.ts`, Playwright)

| Test File         | Covers                                                    |
| ----------------- | --------------------------------------------------------- |
| `login.spec.ts`   | Login page render, SSO redirect/button                    |
| `hadas.spec.ts`   | Call-to-Hadas flow — calling/removing students and groups |
| `journal.spec.ts` | Journal page — task list, date navigation                 |
| `status.spec.ts`  | System status board — Hive health, Madash link status     |

Plus `auth.setup.ts` (Hive SSO login, saves `tests/.auth/user.json`) and
`fixtures.ts` (shared helpers).

Run with `npm run test:e2e`. Requires a running Hive instance and the local
stack (see root `README.md` for dev setup) — CI wires this up automatically
in `.github/workflows/e2e.yml`.
