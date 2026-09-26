import { describe, expect, it } from "vitest";

import { handleClientMessage } from "../../session-server/client-messages";

// Regression: after the move to @system-b90/session-ws the session server stopped
// answering PING, so the status board's Madash tile always showed "down".
describe("session-server client messages", () => {
    const socket = (readyState = 1) => {
        const sent: string[] = [];
        return { sent, ws: { readyState, send: (m: string) => { sent.push(m); } } };
    };

    it("answers PING with PONG", () => {
        const { ws, sent } = socket();
        expect(handleClientMessage(ws as never, { type: "ping" })).toBe(true);
        expect(sent.map((m) => JSON.parse(m))).toEqual([ { type: "pong" } ]);
    });

    it("does not send on a closing socket", () => {
        const { ws, sent } = socket(2);
        handleClientMessage(ws as never, { type: "ping" });
        expect(sent).toEqual([]);
    });

    it("leaves other frames unhandled", () => {
        const { ws, sent } = socket();
        expect(handleClientMessage(ws as never, { type: "madrat-update" })).toBe(false);
        expect(sent).toEqual([]);
    });
});
