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
