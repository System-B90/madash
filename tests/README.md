# MADASH Test Suite

Two layers: Vitest unit tests against server-side logic (`tests/backend/`), and
Playwright end-to-end tests driving the real app + Hive SSO (`tests/*.spec.ts`).

---

## Unit tests (`tests/backend/`, Vitest)

| Test File                        | Covers                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.test.ts`                  | Shared type helpers in `api-shared/types`                                                                                                                                      |
| `errors.test.ts`                 | `api-shared/errors` error class hierarchy                                                                                                                                      |
| `datastore.test.ts`              | In-memory datastore (`api-server/datastore.ts`) — madrat text, call-to-Hadas CRUD/duplicates                                                                                   |
| `hive-client.test.ts`            | `HiveClient` — queries, 401 refresh-and-retry, 500 retry, token-cookie fetch                                                                                                   |
| `sso.test.ts`                    | `authOptions` callbacks — clearance gate (`signIn`), token exchange (`jwt`), session shaping                                                                                   |
| `common.test.ts`                 | `catchHandler` error-to-response mapping, `ApiResponseMaker` cache-control branches                                                                                            |
| `hive-prometheus.test.ts`        | `/api/status/hive-prometheus` — auth gate, unconfigured shortcut, probe branch matrix                                                                                          |
| `session-ws-utils.test.ts`       | Server-side WS singleton (`api-server/web-socket-utils.ts`) — queueing, error/close resets                                                                                     |
| `avatars-route.test.ts`          | `/api/avatars/[slug]` — auth gate, upstream error passthrough, success/failure paths                                                                                           |
| `providers-reducers.test.ts`     | `studentsReducer` / `calledEntitiesReducer` state transitions                                                                                                                  |
| `emotion-stylis.test.ts`         | Emotion cache + stylis prefixer/RTL plugins — `::placeholder` rule insertion regression                                                                                        |
| `websocket-config.test.ts`       | `resolveWebSocketClientConfig` — empty port suffix is preserved                                                                                                                |
| `service-health.test.ts`         | Unified service-health backend — `RingBuffer`, latency window/history, interpreters, prober, monitor (unconfigured/up/slow/dependency/down, cache TTL, shared in-flight round) |
| `services-status-route.test.ts`  | `/api/status/services` — auth gate, one entry per monitored service                                                                                                            |
| `status-tile-state.test.ts`      | Status board pure logic — Hive/Madash state mapping, tile text, sparkline helpers (incl. time-format regression), `startPolling`                                               |
| `toilet-queue-route.test.ts`     | `/api/status/hive/toilet-queue` — students-only query, waiting/out counts, Hive failure                                                                                        |
| `session-server-pong.test.ts`    | Session server answers the status board's PING with PONG (regression)                                                                                                          |
| `call-to-hadas-route.test.ts`    | `/api/call-to-hadas` — group/student dispatch, Hebrew messages, malformed bodies, auth gate                                                                                    |
| `journal-route.test.ts`          | `/api/journal` — read-only past dates, completion timestamps, UTC-day boundary, auth gate                                                                                      |
| `madrat-and-hive-routes.test.ts` | `/api/madrat` raw-text POST, the three Hive delegations, auth gate                                                                                                             |
| `call-to-hadas-client.test.ts`   | `api-client/call-to-hadas` — the four operations that share one endpoint                                                                                                       |
| `ws-ticket-route.test.ts`        | `/api/ws-ticket` — 401 branches, ticket signed with the session's user id                                                                                                      |
| `proxy.test.ts`                  | `src/proxy.ts` — the blanket `/api/*` gate, the NextAuth exemption and its boundary                                                                                            |
| `mentions.test.ts`               | Mention directory (kinds, multi-room, mentors, dedupe, highlight min length), picker search, status breakdown, `/api/hive/staff`                                               |
| `session-harness.ts`             | Not a suite: `signIn`/`signOut` helpers for the `denyUnauthenticated()` gate                                                                                                   |

### Authentication

Every `/api/*` route is gated twice: `src/proxy.ts` refuses unauthenticated
requests for the whole tree, and each data handler calls
`denyUnauthenticated()` itself so protection does not depend on one matcher
staying correct. Suites that are not about the gate run signed in via
`session-harness.ts`; the `auth gate (madash#30)` block in each route suite is
the regression test for it and fails against the pre-gate handlers.

Run with `npm run test:unit` (`vitest run --config tests/vitest.config.ts`).
Environment is plain Node (no DOM) — component/hook tests are limited to
exported pure logic (reducers, utility functions), not full render trees.
Keep component logic in exported pure functions (e.g. `service-health-text.ts`,
`startPolling`) so it stays testable here; rendering is covered by e2e.

---

## End-to-end tests (`tests/*.spec.ts`, Playwright)

| Test File         | Covers                                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `login.spec.ts`   | Login page render, SSO redirect/button                                                                                                                                                                                                                                   |
| `hadas.spec.ts`   | Call-to-Hadas flow — calling/removing students and groups                                                                                                                                                                                                                |
| `journal.spec.ts` | Journal page — task list, date navigation                                                                                                                                                                                                                                |
| `status.spec.ts`  | System status board — every tile + icon, Madash link up with RTT, `/api/status/services` contract, latency/sparkline, down/degraded rendering (mocked payloads), endpoint failure, Hive helps gauge, Hive toilet queue (mocked + live endpoint), collapsed compact strip |

Plus `auth.setup.ts` (Hive SSO login, saves `tests/.auth/user.json`) and
`fixtures.ts` (shared helpers).

Run with `npm run test:e2e`. Requires a running Hive instance and the local
stack (see root `README.md` for dev setup) — CI wires this up automatically
in `.github/workflows/e2e.yml`.
