import { describe, expect, it, vi, beforeEach } from "vitest";
import { MessageTypes } from "@/settings";

let instances: Array<FakeWebSocket>;
let nextInitialReadyState: number;

class FakeWebSocket
{
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState: number;
    onopen: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    onclose: (() => void) | null = null;
    sentMessages: Array<string> = [];
    url: string;

    constructor(url: string)
    {
        this.url = url;
        this.readyState = nextInitialReadyState;
        instances.push(this);
    }

    send(payload: string)
    {
        this.sentMessages.push(payload);
    }
}

async function loadModule()
{
    vi.resetModules();
    return import("@/api-server/web-socket-utils");
}

describe("web-socket-utils", () => {
    beforeEach(() => {
        instances = [];
        nextInitialReadyState = FakeWebSocket.CONNECTING;
        vi.stubGlobal("WebSocket", FakeWebSocket);
    });

    it("queues the message while CONNECTING and flushes it once the socket opens", async () => {
        const { SendServerRequestToSessionServer } = await loadModule();

        const sendPromise = SendServerRequestToSessionServer({ type: MessageTypes.PING });
        const ws = instances[ 0 ];

        expect(ws.sentMessages).toHaveLength(0);

        ws.readyState = FakeWebSocket.OPEN;
        ws.onopen?.();

        await expect(sendPromise).resolves.toBeUndefined();
        expect(ws.sentMessages).toHaveLength(1);
        expect(JSON.parse(ws.sentMessages[ 0 ])).toMatchObject({ type: MessageTypes.PING });
    });

    it("sends immediately when the socket is already OPEN", async () => {
        nextInitialReadyState = FakeWebSocket.OPEN;
        const { SendServerRequestToSessionServer } = await loadModule();

        await SendServerRequestToSessionServer({ type: MessageTypes.PING });

        expect(instances).toHaveLength(1);
        expect(instances[ 0 ].sentMessages).toHaveLength(1);
    });

    it("reuses the existing socket while it is still OPEN", async () => {
        nextInitialReadyState = FakeWebSocket.OPEN;
        const { SendServerRequestToSessionServer } = await loadModule();

        await SendServerRequestToSessionServer({ type: MessageTypes.PING });
        await SendServerRequestToSessionServer({ type: MessageTypes.PONG });

        expect(instances).toHaveLength(1);
        expect(instances[ 0 ].sentMessages).toHaveLength(2);
    });

    it("rejects queued sends and resets the socket on error", async () => {
        const { SendServerRequestToSessionServer } = await loadModule();

        const sendPromise = SendServerRequestToSessionServer({ type: MessageTypes.PING });
        const ws = instances[ 0 ];

        ws.onerror?.(new Error("connection refused"));

        await expect(sendPromise).rejects.toThrow("connection refused");

        // A subsequent send should create a brand new socket rather than reuse the failed one.
        void SendServerRequestToSessionServer({ type: MessageTypes.PONG });
        expect(instances).toHaveLength(2);
    });

    it("creates a new socket after the previous one closes", async () => {
        nextInitialReadyState = FakeWebSocket.OPEN;
        const { SendServerRequestToSessionServer } = await loadModule();

        await SendServerRequestToSessionServer({ type: MessageTypes.PING });
        instances[ 0 ].onclose?.();

        nextInitialReadyState = FakeWebSocket.OPEN;
        await SendServerRequestToSessionServer({ type: MessageTypes.PONG });

        expect(instances).toHaveLength(2);
    });

    it("rejects when the socket is neither OPEN nor CONNECTING", async () => {
        nextInitialReadyState = FakeWebSocket.CLOSED;
        const { SendServerRequestToSessionServer } = await loadModule();

        await expect(SendServerRequestToSessionServer({ type: MessageTypes.PING }))
            .rejects.toThrow("WebSocket is in an invalid state for sending.");
    });
});
