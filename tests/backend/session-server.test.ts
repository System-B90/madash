import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.stubEnv("WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY", "test-auth-key");

import
{
    connectedSessions,
    registeredSyncObjectConnections,
    registerSession,
    registerSyncObjectConnection,
    buildMessage,
    validateServerMessage,
    handleServerMessage,
    dispatchMessageToEveryone,
    dispatchToSyncObjectListeners,
    abandonedSessionsGC,
    ConnectedSession,
} from "../../session-server/session-dispatch";
import { MessageTypes, COMBO_DATA_KEY } from "../../session-server/session-common";

function fakeSocket()
{
    return { send: vi.fn() } as unknown as ConnectedSession[ 'ws' ];
}

describe("session-dispatch", () => {
    beforeEach(() => {
        connectedSessions.length = 0;
        Object.keys(registeredSyncObjectConnections).forEach((key) => delete registeredSyncObjectConnections[ key ]);
    });

    describe("validateServerMessage", () => {
        it("throws when authKey is missing", () => {
            expect(() => validateServerMessage({})).toThrow('Missing "authKey"');
        });

        it("throws when authKey is invalid", () => {
            expect(() => validateServerMessage({ authKey: "wrong" })).toThrow('Invalid "authKey"');
        });

        it("does not throw for a valid authKey", () => {
            expect(() => validateServerMessage({ authKey: "test-auth-key" })).not.toThrow();
        });
    });

    describe("buildMessage", () => {
        it("includes the combo data key only for COMBO messages", () => {
            const message = JSON.parse(buildMessage(MessageTypes.COMBO, undefined, { [ COMBO_DATA_KEY ]: [ 1, 2 ] }));
            expect(message[ COMBO_DATA_KEY ]).toEqual([ 1, 2 ]);
        });

        it("omits the combo data key for non-COMBO messages", () => {
            const message = JSON.parse(buildMessage(MessageTypes.PING, undefined, { foo: "bar" }));
            expect(message[ COMBO_DATA_KEY ]).toBeUndefined();
            expect(message.data).toEqual({ foo: "bar" });
        });

        it("asserts when data is undefined for a COMBO message", () => {
            expect(() => buildMessage(MessageTypes.COMBO)).toThrow();
        });
    });

    describe("registerSession / registerSyncObjectConnection", () => {
        it("asserts on a non-string initiatorKey", () => {
            expect(() => registerSession(fakeSocket(), 123 as any)).toThrow();
        });

        it("asserts on a non-string syncObjectId", () => {
            expect(() => registerSyncObjectConnection(fakeSocket(), 123 as any)).toThrow();
        });

        it("registers a session for later dispatch", () => {
            const ws = fakeSocket();
            registerSession(ws, "user-1");
            expect(connectedSessions).toHaveLength(1);
            expect(connectedSessions[ 0 ].initiatorKey).toBe("user-1");
        });
    });

    describe("dispatchToSyncObjectListeners", () => {
        it("no-ops when there are no registered listeners", () => {
            expect(() => dispatchToSyncObjectListeners(MessageTypes.SYNC_OBJECT_UPDATE, "unknown-id")).not.toThrow();
        });

        it("sends to every registered listener for the sync object", () => {
            const ws = fakeSocket();
            registerSyncObjectConnection(ws, "obj-1");

            dispatchToSyncObjectListeners(MessageTypes.SYNC_OBJECT_UPDATE, "obj-1", { value: 42 });

            expect(ws.send).toHaveBeenCalledTimes(1);
        });
    });

    describe("dispatchMessageToEveryone", () => {
        it("sends to every connected session and fans out to string targets", () => {
            const userWs = fakeSocket();
            registerSession(userWs, "user-1");

            const syncWs = fakeSocket();
            registerSyncObjectConnection(syncWs, "obj-1");

            dispatchMessageToEveryone(MessageTypes.STUDENTS_TO_HADAS_UPDATE, "obj-1");

            expect(userWs.send).toHaveBeenCalledTimes(1);
            expect(syncWs.send).toHaveBeenCalledTimes(1);
        });

        it("fans out to array targets", () => {
            const syncWsA = fakeSocket();
            registerSyncObjectConnection(syncWsA, "obj-a");
            const syncWsB = fakeSocket();
            registerSyncObjectConnection(syncWsB, "obj-b");

            dispatchMessageToEveryone(MessageTypes.STUDENTS_TO_HADAS_UPDATE, [ "obj-a", "obj-b" ]);

            expect(syncWsA.send).toHaveBeenCalledTimes(1);
            expect(syncWsB.send).toHaveBeenCalledTimes(1);
        });
    });

    describe("handleServerMessage", () => {
        it("dispatches when the authKey is valid", () => {
            const ws = fakeSocket();
            registerSession(ws, "user-1");

            handleServerMessage({ authKey: "test-auth-key", type: MessageTypes.MADRAT_TEXT_UPDATE });

            expect(ws.send).toHaveBeenCalledTimes(1);
        });

        it("swallows the error and does not dispatch when the authKey is invalid", () => {
            const ws = fakeSocket();
            registerSession(ws, "user-1");

            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            expect(() => handleServerMessage({ authKey: "wrong", type: MessageTypes.MADRAT_TEXT_UPDATE })).not.toThrow();

            expect(ws.send).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe("abandonedSessionsGC", () => {
        // Note: the GC purges via `delete connectedSessions[i]` on an array, which leaves a
        // hole rather than shrinking `.length` — so we assert on `Object.keys(...)` (which
        // skips holes) instead of `.length`.
        it("purges a session only after two consecutive untouched GC passes", () => {
            const ws = fakeSocket();
            registerSession(ws, "user-1");

            abandonedSessionsGC(); // Round 1: marks as abandoned
            expect(Object.keys(connectedSessions)).toHaveLength(1);

            abandonedSessionsGC(); // Round 2: was still marked -> purged
            expect(Object.keys(connectedSessions)).toHaveLength(0);
        });

        it("keeps a session that is touched between GC passes", () => {
            const ws = fakeSocket();
            registerSession(ws, "user-1");

            abandonedSessionsGC(); // Round 1: marks as abandoned

            // Session is "touched" again (e.g. a message was dispatched to it)
            dispatchMessageToEveryone(MessageTypes.PING);

            abandonedSessionsGC(); // Round 2: was refreshed in between -> survives, re-marked
            expect(Object.keys(connectedSessions)).toHaveLength(1);
        });
    });
});
