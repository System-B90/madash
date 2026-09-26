/*
 * Thin entry over the shared server core (@system-b90/session-ws/server):
 * ticket-authenticated connects, session/sync registries, heartbeat, and
 * graceful shutdown live in the package; Madash plugs in its wire vocabulary.
 * All dispatches originate from server-authenticated HTTP→WS frames sent via
 * src/api-server/web-socket-utils.ts; the only client frame Madash handles
 * itself is the status board's PING (see client-messages.ts).
 */
import { startSessionServer } from "@system-b90/session-ws/server";

import { handleClientMessage } from "./client-messages";
import { MessageTypes } from "./session-common";

const server = startSessionServer({
    validMessageTypes: Object.values(MessageTypes),
    onClientMessage: (ws, data) => handleClientMessage(ws, data),
});

export default server.wss;
