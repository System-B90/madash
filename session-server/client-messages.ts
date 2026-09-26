import type { WebSocket } from "ws";

import { MessageTypes } from "./session-common";

/**
 * Madash's app-level client frames, plugged into the shared core via
 * `onClientMessage`. The status board's Madash tile pings every second and
 * judges the link on the PONG round trip — without this reply every client
 * saw the link as down.
 */
export function handleClientMessage(ws: Pick<WebSocket, "send" | "readyState">, data: { type?: unknown; }): boolean
{
    if (data.type !== MessageTypes.PING) return false;
    // 1 === WebSocket.OPEN; avoids a runtime import of `ws` here.
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: MessageTypes.PONG }));
    return true;
}
