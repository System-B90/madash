import { render, screen, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth-provider", () => ({
    useAuth: vi.fn(),
}));

import SharedSyncObjectProvider, {
    registerSyncProvider,
    SharedSyncObjectContext,
} from "@/components/shared-sync-object-provider";
import { useAuth } from "@/components/auth-provider";
import { MessageTypes } from "@/settings";

type Handler = (type: MessageTypes, data: unknown, target?: string) => void;

/** Captures what the provider sends and the handler it registers upstream. */
function stubAuth() {
    const sent: Array<unknown> = [];
    const handlers: Array<Handler> = [];
    let removed = 0;

    vi.mocked(useAuth).mockReturnValue({
        sendMessage: (data: unknown) => sent.push(data),
        addMessageHandler: (handler: Handler) => {
            handlers.push(handler);
            return () => {
                removed += 1;
            };
        },
    } as never);

    return {
        sent,
        /** The dispatcher the provider handed to the user session. */
        dispatch: (...args: Parameters<Handler>) => handlers.at(-1)?.(...args),
        get upstreamRemovals() {
            return removed;
        },
    };
}

beforeEach(() => {
    vi.mocked(useAuth).mockReset();
});

describe("registerSyncProvider", () => {
    it("emits a register message for the sync object", () => {
        const sent: Array<unknown> = [];

        registerSyncProvider((data) => sent.push(data), "obj-1");

        expect(sent).toEqual([
            { type: MessageTypes.REGISTER_SYNC_PROVIDER, syncObjectId: "obj-1" },
        ]);
    });

    it("returns a cleanup that emits the matching deregister", () => {
        const sent: Array<unknown> = [];

        const cleanup = registerSyncProvider((data) => sent.push(data), "obj-1");
        expect(sent).toHaveLength(1);

        cleanup();

        expect(sent[1]).toEqual({
            type: MessageTypes.DEREGISTER_SYNC_PROVIDER,
            syncObjectId: "obj-1",
        });
    });

    it("deregisters the same id it registered", () => {
        // A mismatch here leaves a server-side listener behind for the life of
        // the socket, and the next mount registers a second one.
        const sent: Array<{ syncObjectId: string }> = [];

        registerSyncProvider((d) => sent.push(d as never), "obj-42")();

        expect(sent[0].syncObjectId).toBe(sent[1].syncObjectId);
    });
});

describe("SharedSyncObjectProvider lifecycle", () => {
    it("registers with the server on mount", () => {
        const auth = stubAuth();

        render(
            <SharedSyncObjectProvider id="obj-1">
                <div>child</div>
            </SharedSyncObjectProvider>,
        );

        expect(auth.sent).toContainEqual({
            type: MessageTypes.REGISTER_SYNC_PROVIDER,
            syncObjectId: "obj-1",
        });
        expect(screen.getByText("child")).toBeInTheDocument();
    });

    it("deregisters on unmount", async () => {
        const auth = stubAuth();
        const { unmount } = render(
            <SharedSyncObjectProvider id="obj-1">
                <div>child</div>
            </SharedSyncObjectProvider>,
        );

        unmount();

        await waitFor(() =>
            expect(auth.sent).toContainEqual({
                type: MessageTypes.DEREGISTER_SYNC_PROVIDER,
                syncObjectId: "obj-1",
            }),
        );
    });
});

describe("SharedSyncObjectProvider target filtering", () => {
    /** Renders the provider and returns a child-registered spy handler. */
    function renderWithChildHandler(id: string) {
        const auth = stubAuth();
        const received: Array<{ type: MessageTypes; data: unknown; target?: string }> = [];

        function Child() {
            const { addMessageHandler } = useSyncContext();
            // Register once on first render; the provider's registry is a ref.
            if (received.length === 0 && !registered) {
                registered = true;
                addMessageHandler((type, data, target) =>
                    received.push({ type, data, target }),
                );
            }
            return <div>child</div>;
        }
        let registered = false;

        render(
            <SharedSyncObjectProvider id={id}>
                <Child />
            </SharedSyncObjectProvider>,
        );

        return { auth, received };
    }

    it("passes a message addressed to this sync object through to children", () => {
        const { auth, received } = renderWithChildHandler("obj-1");

        auth.dispatch(MessageTypes.SYNC_OBJECT_UPDATE, { n: 1 }, "obj-1");

        expect(received).toEqual([
            { type: MessageTypes.SYNC_OBJECT_UPDATE, data: { n: 1 }, target: "obj-1" },
        ]);
    });

    it("drops a message addressed to a different sync object", () => {
        // Every provider on the page sees every message; the id check is the
        // only thing keeping one board's updates out of another's.
        const { auth, received } = renderWithChildHandler("obj-1");

        auth.dispatch(MessageTypes.SYNC_OBJECT_UPDATE, { n: 1 }, "obj-2");

        expect(received).toEqual([]);
    });

    it("drops a message with no target at all", () => {
        const { auth, received } = renderWithChildHandler("obj-1");

        auth.dispatch(MessageTypes.SYNC_OBJECT_UPDATE, { n: 1 });

        expect(received).toEqual([]);
    });

    it("forwards the message type unchanged", () => {
        const { auth, received } = renderWithChildHandler("obj-1");

        auth.dispatch(MessageTypes.STUDENTS_TO_HADAS_UPDATE, null, "obj-1");

        expect(received[0].type).toBe(MessageTypes.STUDENTS_TO_HADAS_UPDATE);
    });
});

/** Reads the context the provider publishes to its children. */
function useSyncContext() {
    return useContext(SharedSyncObjectContext);
}
