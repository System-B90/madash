import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api-client/common", () => ({ safeApiFetcher: vi.fn() }));

import {
    apiCallStudentToHadas,
    apiGetStudentsCalledToHadas,
    apiRemoveStudentCallToHadas,
    apiUpdateStateStudentCallToHadas,
} from "@/api-client/call-to-hadas";
import { safeApiFetcher } from "@/api-client/common";

/** The (url, init) pair the client handed to the fetcher. */
function lastCall()
{
    const [ url, init ] = vi.mocked(safeApiFetcher).mock.calls.at(-1) ?? [];
    return { url, init: init as RequestInit | undefined };
}

const STUDENTS = [ { hiveId: 1, name: "דנה כהן" } ];

beforeEach(() => {
    vi.mocked(safeApiFetcher).mockReset().mockResolvedValue(undefined as never);
});

describe("apiGetStudentsCalledToHadas", () => {
    it("GETs the endpoint with no init", async () => {
        vi.mocked(safeApiFetcher).mockResolvedValue([ { callId: "a" } ] as never);

        const result = await apiGetStudentsCalledToHadas();

        expect(lastCall().url).toBe("/api/call-to-hadas");
        expect(lastCall().init).toBeUndefined();
        expect(result).toEqual([ { callId: "a" } ]);
    });

    it("passes the unwrapped data straight through", async () => {
        // safeApiFetcher already unwraps the { status, data } envelope, so the
        // client must not unwrap a second time.
        vi.mocked(safeApiFetcher).mockResolvedValue([] as never);

        expect(await apiGetStudentsCalledToHadas()).toEqual([]);
    });

    it("propagates a rejection rather than swallowing it", async () => {
        vi.mocked(safeApiFetcher).mockRejectedValue(new Error("network"));

        await expect(apiGetStudentsCalledToHadas()).rejects.toThrow("network");
    });
});

describe("apiCallStudentToHadas", () => {
    const params = {
        students: STUDENTS,
        reason: "שיחה",
        expirationTime: "2026-09-19T12:00:00.000Z",
        groupCall: false,
    };

    it("PUTs the params as a JSON body", async () => {
        await apiCallStudentToHadas(params as never);

        const { url, init } = lastCall();
        expect(url).toBe("/api/call-to-hadas");
        expect(init?.method).toBe("PUT");
        expect(JSON.parse(init?.body as string)).toEqual(params);
    });

    it("preserves the groupCall flag when true", async () => {
        await apiCallStudentToHadas({ ...params, groupCall: true } as never);

        expect(JSON.parse(lastCall().init?.body as string).groupCall).toBe(true);
    });

    it("returns the server's Hebrew confirmation message", async () => {
        vi.mocked(safeApiFetcher).mockResolvedValue(
            'החניכים דנה כהן נקראו לחד"ס' as never,
        );

        expect(await apiCallStudentToHadas(params as never)).toBe(
            'החניכים דנה כהן נקראו לחד"ס',
        );
    });
});

describe("apiRemoveStudentCallToHadas", () => {
    it("DELETEs with the call id in the body", async () => {
        await apiRemoveStudentCallToHadas({ callId: "abc" } as never);

        const { url, init } = lastCall();
        expect(url).toBe("/api/call-to-hadas");
        expect(init?.method).toBe("DELETE");
        expect(JSON.parse(init?.body as string)).toEqual({ callId: "abc" });
    });

    it("resolves to undefined", async () => {
        vi.mocked(safeApiFetcher).mockResolvedValue("a message" as never);

        // Deliberately discards the server's message -- the caller refetches.
        expect(await apiRemoveStudentCallToHadas({ callId: "abc" } as never)).toBeUndefined();
    });

    it("propagates a rejection", async () => {
        vi.mocked(safeApiFetcher).mockRejectedValue(new Error("no such call"));

        await expect(
            apiRemoveStudentCallToHadas({ callId: "abc" } as never),
        ).rejects.toThrow("no such call");
    });
});

describe("apiUpdateStateStudentCallToHadas", () => {
    it("POSTs the call id and new state", async () => {
        await apiUpdateStateStudentCallToHadas({
            callId: "abc",
            state: "הגיע",
        } as never);

        const { url, init } = lastCall();
        expect(url).toBe("/api/call-to-hadas");
        expect(init?.method).toBe("POST");
        expect(JSON.parse(init?.body as string)).toEqual({
            callId: "abc",
            state: "הגיע",
        });
    });

    it("resolves to undefined", async () => {
        expect(
            await apiUpdateStateStudentCallToHadas({
                callId: "abc",
                state: "הגיע",
            } as never),
        ).toBeUndefined();
    });
});

describe("HTTP verb mapping", () => {
    it("maps each operation to its own verb on one endpoint", async () => {
        // All four share /api/call-to-hadas and are told apart only by verb,
        // so a swapped method silently performs the wrong operation.
        await apiGetStudentsCalledToHadas();
        const get = lastCall().init?.method;

        await apiCallStudentToHadas({ students: [], reason: "", expirationTime: "" } as never);
        const put = lastCall().init?.method;

        await apiRemoveStudentCallToHadas({ callId: "a" } as never);
        const del = lastCall().init?.method;

        await apiUpdateStateStudentCallToHadas({ callId: "a", state: "x" } as never);
        const post = lastCall().init?.method;

        expect([ get, put, del, post ]).toEqual([ undefined, "PUT", "DELETE", "POST" ]);
    });
});
