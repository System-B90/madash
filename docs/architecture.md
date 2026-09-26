# Architecture

```
Browser → src/api-client (fetch) → src/app/api (routes) → src/api-server (Hive/state)
                                src/api-shared (types & contracts shared by both ends)
```

| Directory         | Role                                                   |
| ----------------- | ------------------------------------------------------ |
| `src/api-client`  | Client-side fetch wrappers                             |
| `src/app/api`     | Next.js route handlers                                 |
| `src/api-server`  | Server-side state + Hive client                        |
| `src/api-shared`  | Types/contracts shared by client and server            |
| `src/components`  | React UI (journal, system-status-board, header, theme) |
| `session-server/` | Standalone WebSocket server for real-time updates      |
| `tests/`          | Vitest unit tests + Playwright e2e tests               |

## In-memory state — a deliberate constraint, not a gap

MADASH is intentionally a **volatile app**: it has no database. Server-side
state lives entirely in-process:

- `src/api-server/datastore.ts` — a single in-memory `data` object (`madratText`,
  `calledToHadas`). Lost on every restart/redeploy.
- `session-server/session-dispatch.ts` — `connectedSessions` and
  `registeredSyncObjectConnections` (WebSocket registries for the session
  server). Exist only for the lifetime of that process.
- `src/api-server/service-health/monitor.ts` — per-service latency window and
  latency history for the status board, each a fixed-capacity `RingBuffer`
  (constant memory; oldest samples are overwritten). Empty after a restart.
- `src/api-server/web-socket-utils.ts` — a single shared WebSocket connection
  per Next.js server process, used to push server-side state changes to the
  session server for fan-out to clients.

**Implication:** all of this is single-process state. Running more than one
replica of MADASH or the session server today means state (and WebSocket
message delivery) silently diverges between replicas — a client connected to
replica A won't see a call-to-Hadas created via replica B. This is fine at
MADASH's current scale (single instance), but is the reason a shared store
will be needed if/when MADASH is horizontally scaled.

**Planned:** persistence (likely MongoDB, mirroring Bluz's calendar-engine
pattern in `ui/src/api-server/mongo-db-controller.ts`) is expected once the
app's requirements call for it. Until then, don't add caching layers or
scaling workarounds for this in-memory state — it's working as designed.

## System status board ("מצב העולם")

Every tile renders through one component, `ServiceHealthTile`
(`src/components/system-status-board/shared-ui.tsx`), driven by the shared
state model in `src/api-shared/service-health.ts`:
`up | degraded | down | unconfigured` (+ client-only `loading`). **Degraded**
means reachable but unwell: slow, or the service reporting a degraded dependency.

| Tile       | Source                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Madash     | Client-side WebSocket ping/pong: silence and round-trip time                                                                                                            |
| Hive       | `/api/status/hive-prometheus` (Prometheus load) + `/api/status/hive/open-helps` + `/api/status/hive/toilet-queue` (students in `Toilet Request` status) — kept separate |
| Bluz       | `/api/status/services` → `${BLUZ_URL}/api/health` (reports Mongo/Postgres/Hive checks)                                                                                  |
| Peek-a-Boo | `/api/status/services` → `${PEEKABOO_URL}/api/health` (liveness)                                                                                                        |

The unified backend (`src/api-server/service-health/`) is split so new services
only add a registry entry:

- `probe.ts` — one timed GET, never throws; a per-service **interpreter** turns
  the body into a verdict (Bluz's report format, or plain liveness).
- `registry.ts` — service id → base-URL env var, health path, interpreter.
- `monitor.ts` — probes all services in parallel, judges slowness on the
  **median** of the last 5 probes (`SERVICE_HEALTH_DEGRADED_LATENCY_MS`,
  default 1500), keeps 60 raw samples for the latency sparkline, and caches a
  round for 10 s so many open boards share one set of probes.

Probes run only while someone is viewing the board (on request, not on a timer),
so the latency history covers the time the board has been watched.
