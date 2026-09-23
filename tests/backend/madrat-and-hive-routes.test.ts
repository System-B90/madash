import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/api-server/hive/sso", () => ({ authOptions: {} }));

vi.mock("@/api-server/datastore", () => ({
    getMadratText: vi.fn(),
    modifyMadratText: vi.fn(),
}));

vi.mock("@/api-server/hive/session-client", () => ({ default: vi.fn() }));

import { GET as madratGET, POST as madratPOST } from "@/app/api/madrat/route";
import { refusal, signIn, signOut } from "./session-harness";
import { GET as classesGET } from "@/app/api/hive/classes/route";
import { GET as studentsGET } from "@/app/api/hive/students/route";
import { GET as openHelpsGET } from "@/app/api/status/hive/open-helps/route";
import { getMadratText, modifyMadratText } from "@/api-server/datastore";
import createHiveClient from "@/api-server/hive/session-client";

async function envelope(response: Response)
{
    return (await response.json()) as { status: number; data?: unknown };
}

const request = (url: string, init?: RequestInit) =>
    new NextRequest(url, init as never);

/** Stubs the session-scoped Hive client with the given methods. */
function stubHiveClient(methods: Record<string, unknown>)
{
    vi.mocked(createHiveClient).mockResolvedValue(methods as never);
}

beforeEach(() => {
    vi.mocked(getMadratText).mockReset().mockResolvedValue("" as never);
    vi.mocked(modifyMadratText).mockReset().mockResolvedValue(undefined as never);
    vi.mocked(createHiveClient).mockReset();
    // Every handler is gated now; suites not about the gate run signed in.
    signIn();
});

describe("GET /api/madrat", () => {
    it("returns the stored text", async () => {
        vi.mocked(getMadratText).mockResolvedValue("מדרת היום" as never);

        const body = await envelope(await madratGET(request("https://madash.test/api/madrat")));

        expect(body.status).toBe(0);
        expect(body.data).toBe("מדרת היום");
    });

    it("maps a datastore failure to the error envelope", async () => {
        vi.mocked(getMadratText).mockRejectedValue(new Error("boom"));

        const response = await madratGET(request("https://madash.test/api/madrat"));

        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("POST /api/madrat", () => {
    it("reads the body as raw text, not JSON", async () => {
        // The client posts a plain string; parsing it as JSON would reject
        // every message that is not itself valid JSON.
        await madratPOST(
            request("https://madash.test/api/madrat", {
                method: "POST",
                body: "הודעה חדשה",
            }),
        );

        expect(modifyMadratText).toHaveBeenCalledWith("הודעה חדשה");
    });

    it("accepts text that is not valid JSON", async () => {
        const response = await madratPOST(
            request("https://madash.test/api/madrat", {
                method: "POST",
                body: "{ not json at all",
            }),
        );

        expect((await envelope(response)).status).toBe(0);
        expect(modifyMadratText).toHaveBeenCalledWith("{ not json at all");
    });

    it("accepts an empty body", async () => {
        const response = await madratPOST(
            request("https://madash.test/api/madrat", { method: "POST", body: "" }),
        );

        expect((await envelope(response)).status).toBe(0);
        expect(modifyMadratText).toHaveBeenCalledWith("");
    });

    it("returns an empty success envelope", async () => {
        const body = await envelope(
            await madratPOST(
                request("https://madash.test/api/madrat", {
                    method: "POST",
                    body: "text",
                }),
            ),
        );

        expect(body).toEqual({ status: 0 });
    });

    it("maps a write failure to the error envelope", async () => {
        vi.mocked(modifyMadratText).mockRejectedValue(new Error("disk full"));

        const response = await madratPOST(
            request("https://madash.test/api/madrat", {
                method: "POST",
                body: "text",
            }),
        );

        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("GET /api/hive/classes", () => {
    it("returns the client's classes", async () => {
        stubHiveClient({ getClasses: vi.fn().mockResolvedValue([ { id: 1 } ]) });

        const body = await envelope(
            await classesGET(request("https://madash.test/api/hive/classes")),
        );

        expect(body.status).toBe(0);
        expect(body.data).toEqual([ { id: 1 } ]);
    });

    it("maps a Hive failure to the error envelope", async () => {
        stubHiveClient({
            getClasses: vi.fn().mockRejectedValue(new Error("hive down")),
        });

        const response = await classesGET(
            request("https://madash.test/api/hive/classes"),
        );

        expect((await envelope(response)).status).toBe(-1);
    });

    it("maps a client-construction failure to the error envelope", async () => {
        // createHiveClient throws UserNotLoggedInError without a session;
        // catchHandler turns that into NextResponse.error() rather than an
        // envelope, so the route must not leak the raw rejection.
        vi.mocked(createHiveClient).mockRejectedValue(new Error("no session"));

        const response = await classesGET(
            request("https://madash.test/api/hive/classes"),
        );

        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("GET /api/hive/students", () => {
    it("requests only clearance 1 (Hanich) users", async () => {
        const getUsers = vi.fn().mockResolvedValue([ { id: 7 } ]);
        stubHiveClient({ getUsers });

        const body = await envelope(
            await studentsGET(request("https://madash.test/api/hive/students")),
        );

        // The filter is the whole point of this route: madash shows students,
        // not staff.
        expect(getUsers).toHaveBeenCalledWith({ clearance__in: "1" });
        expect(body.data).toEqual([ { id: 7 } ]);
    });

    it("maps a Hive failure to the error envelope", async () => {
        stubHiveClient({
            getUsers: vi.fn().mockRejectedValue(new Error("hive down")),
        });

        const response = await studentsGET(
            request("https://madash.test/api/hive/students"),
        );

        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("GET /api/status/hive/open-helps", () => {
    it("wraps the count in an object", async () => {
        stubHiveClient({ getOpenHelpsCount: vi.fn().mockResolvedValue(12) });

        const body = await envelope(
            await openHelpsGET(
                request("https://madash.test/api/status/hive/open-helps"),
            ),
        );

        // The gauge reads `data.count`, not a bare number.
        expect(body.data).toEqual({ count: 12 });
    });

    it("passes a zero count through rather than treating it as absent", async () => {
        stubHiveClient({ getOpenHelpsCount: vi.fn().mockResolvedValue(0) });

        const body = await envelope(
            await openHelpsGET(
                request("https://madash.test/api/status/hive/open-helps"),
            ),
        );

        expect(body.data).toEqual({ count: 0 });
    });

    it("maps a Hive failure to the error envelope", async () => {
        stubHiveClient({
            getOpenHelpsCount: vi.fn().mockRejectedValue(new Error("hive down")),
        });

        const response = await openHelpsGET(
            request("https://madash.test/api/status/hive/open-helps"),
        );

        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("auth gate (madash#30)", () => {
    // /api/madrat had no session check at all, so its POST was an
    // unauthenticated write to the board every user sees. Gated on the
    // owner's call in #37; these assertions fail on the pre-fix handlers.
    beforeEach(() => signOut());

    it("madrat POST refuses with no session", async () => {
        const response = await madratPOST(
            request("https://madash.test/api/madrat", {
                method: "POST",
                body: "anyone can write this",
            }),
        );

        const { httpStatus, body } = await refusal(response);
        expect(httpStatus).toBe(401);
        expect(body.status).toBe(-1);
        expect(body.error?.name).toBe("UserNotLoggedInError");
        // Refused before the write, not alongside it.
        expect(modifyMadratText).not.toHaveBeenCalled();
    });

    it("madrat GET refuses with no session", async () => {
        // The board text is as readable as it is writable; gating one end
        // only would leave the contents public.
        const { httpStatus } = await refusal(
            await madratGET(request("https://madash.test/api/madrat")),
        );

        expect(httpStatus).toBe(401);
        expect(getMadratText).not.toHaveBeenCalled();
    });

    it("lets a signed-in caller through", async () => {
        signIn();

        expect((await envelope(await madratGET(request("https://madash.test/api/madrat")))).status)
            .toBe(0);
        expect(getMadratText).toHaveBeenCalled();
    });

    // The three Hive routes still hold no gate of their own: createHiveClient()
    // needs a session to build a client, so they fail closed through the
    // dependency. Pinned separately because that is an accident rather than a
    // deliberate gate -- the middleware is what now makes it deliberate.
    it("hive routes fail when no session can produce a client", async () => {
        signIn();
        vi.mocked(createHiveClient).mockRejectedValue(
            new Error("Unauthorized: No active session found."),
        );

        for (const handler of [ classesGET, studentsGET, openHelpsGET ]) {
            const response = await handler(request("https://madash.test/api/x"));
            expect((await envelope(response)).status).toBe(-1);
        }
    });
});
