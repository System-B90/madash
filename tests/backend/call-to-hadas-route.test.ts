import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/api-server/hive/sso", () => ({ authOptions: {} }));

vi.mock("@/api-server/datastore", () => ({
    getCallsToHadas: vi.fn(),
    addStudentCallToHadas: vi.fn(),
    addGroupCallToHadas: vi.fn(),
    removeCallToHadas: vi.fn(),
    updateCallToHadasState: vi.fn(),
}));

import { DELETE, GET, POST, PUT } from "@/app/api/call-to-hadas/route";
import { refusal, signIn, signInWithoutUserId, signOut } from "./session-harness";
import {
    addGroupCallToHadas,
    addStudentCallToHadas,
    getCallsToHadas,
    removeCallToHadas,
    updateCallToHadasState,
} from "@/api-server/datastore";

const URL_ = "https://madash.test/api/call-to-hadas";

function jsonRequest(method: string, body: unknown)
{
    return new NextRequest(URL_, {
        method,
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}

function rawRequest(method: string, body: string)
{
    return new NextRequest(URL_, { method, body });
}

/** The `{ status, data }` envelope every route returns. */
async function envelope(response: Response)
{
    return (await response.json()) as { status: number; data?: unknown; error?: unknown };
}

const STUDENTS = [
    { hiveId: 1, name: "דנה כהן" },
    { hiveId: 2, name: "יואב בן ארי" },
];

beforeEach(() => {
    vi.mocked(getCallsToHadas).mockReset().mockResolvedValue([] as never);
    vi.mocked(addStudentCallToHadas).mockReset();
    vi.mocked(addGroupCallToHadas).mockReset();
    vi.mocked(removeCallToHadas).mockReset();
    vi.mocked(updateCallToHadasState).mockReset();
    // Every handler is gated now; suites not about the gate run signed in.
    signIn();
});

describe("GET /api/call-to-hadas", () => {
    it("returns the datastore's calls in the success envelope", async () => {
        vi.mocked(getCallsToHadas).mockResolvedValue([ { callId: "a" } ] as never);

        const body = await envelope(await GET(new NextRequest(URL_)));

        expect(body.status).toBe(0);
        expect(body.data).toEqual([ { callId: "a" } ]);
    });

    it("maps a datastore failure to the error envelope", async () => {
        vi.mocked(getCallsToHadas).mockRejectedValue(new Error("boom"));

        const response = await GET(new NextRequest(URL_));

        expect(response.status).toBe(200);
        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("PUT /api/call-to-hadas", () => {
    it("calls each student individually when groupCall is false", async () => {
        const response = await PUT(
            jsonRequest("PUT", {
                students: STUDENTS,
                reason: "שיחה",
                expirationTime: "2026-09-19T12:00:00.000Z",
                groupCall: false,
            }),
        );

        expect(addStudentCallToHadas).toHaveBeenCalledTimes(2);
        expect(addGroupCallToHadas).not.toHaveBeenCalled();
        expect((await envelope(response)).status).toBe(0);
    });

    it("creates a single entry when groupCall is true", async () => {
        await PUT(
            jsonRequest("PUT", {
                students: STUDENTS,
                reason: "שיחה",
                expirationTime: "2026-09-19T12:00:00.000Z",
                groupCall: true,
            }),
        );

        expect(addGroupCallToHadas).toHaveBeenCalledTimes(1);
        expect(addStudentCallToHadas).not.toHaveBeenCalled();
        expect(vi.mocked(addGroupCallToHadas).mock.calls[0][0]).toEqual(STUDENTS);
    });

    it("converts expirationTime into a dayjs instance", async () => {
        await PUT(
            jsonRequest("PUT", {
                students: [ STUDENTS[0] ],
                reason: "שיחה",
                expirationTime: "2026-09-19T12:00:00.000Z",
                groupCall: false,
            }),
        );

        const expiration = vi.mocked(addStudentCallToHadas).mock.calls[0][2];
        expect(typeof expiration.toISOString).toBe("function");
        expect(expiration.toISOString()).toBe("2026-09-19T12:00:00.000Z");
    });

    it("names every called student in the Hebrew success message", async () => {
        const body = await envelope(
            await PUT(
                jsonRequest("PUT", {
                    students: STUDENTS,
                    reason: "שיחה",
                    expirationTime: "2026-09-19T12:00:00.000Z",
                    groupCall: false,
                }),
            ),
        );

        expect(body.data).toBe('החניכים דנה כהן, יואב בן ארי נקראו לחד"ס');
    });

    it("returns the error envelope for a malformed body", async () => {
        const response = await PUT(rawRequest("PUT", "{not json"));

        expect((await envelope(response)).status).toBe(-1);
        expect(addStudentCallToHadas).not.toHaveBeenCalled();
    });

    it("returns the error envelope when students is missing", async () => {
        // `students.forEach` throws on undefined; the point is that it becomes
        // a handled envelope rather than an unhandled 500.
        const response = await PUT(jsonRequest("PUT", { reason: "שיחה" }));

        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("DELETE /api/call-to-hadas", () => {
    it("reports the student's name when removing a student call", async () => {
        vi.mocked(removeCallToHadas).mockReturnValue({
            type: "student",
            student: { name: "דנה כהן" },
        } as never);

        const body = await envelope(
            await DELETE(jsonRequest("DELETE", { callId: "abc" })),
        );

        expect(removeCallToHadas).toHaveBeenCalledWith("abc");
        expect(body.data).toBe('הוסר קריאה לחד"ס עבור החניך דנה כהן');
    });

    it("reports the group name when removing a group call", async () => {
        vi.mocked(removeCallToHadas).mockReturnValue({
            type: "group",
            groupName: "כיתה א",
        } as never);

        const body = await envelope(
            await DELETE(jsonRequest("DELETE", { callId: "abc" })),
        );

        expect(body.data).toBe('הוסר קריאה לחד"ס עבור קבוצה כיתה א');
    });

    it("returns the error envelope when the call id is unknown", async () => {
        vi.mocked(removeCallToHadas).mockImplementation(() => {
            throw new Error("no such call");
        });

        const response = await DELETE(jsonRequest("DELETE", { callId: "nope" }));

        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("POST /api/call-to-hadas", () => {
    it("reports the student's new state", async () => {
        vi.mocked(updateCallToHadasState).mockReturnValue({
            type: "student",
            student: { name: "דנה כהן" },
        } as never);

        const body = await envelope(
            await POST(jsonRequest("POST", { callId: "abc", state: "הגיע" })),
        );

        expect(updateCallToHadasState).toHaveBeenCalledWith("abc", "הגיע");
        expect(body.data).toBe("הוחלף מצב החניך דנה כהן ל-הגיע");
    });

    it("reports a group state change", async () => {
        vi.mocked(updateCallToHadasState).mockReturnValue({
            type: "group",
            groupName: "כיתה א",
        } as never);

        const body = await envelope(
            await POST(jsonRequest("POST", { callId: "abc", state: "הגיע" })),
        );

        expect(body.data).toBe("מצב הקבוצה הווחלפה ל-הגיע");
    });

    it("returns the error envelope for a malformed body", async () => {
        const response = await POST(rawRequest("POST", "not json at all"));

        expect((await envelope(response)).status).toBe(-1);
        expect(updateCallToHadasState).not.toHaveBeenCalled();
    });
});

describe("auth gate (madash#30)", () => {
    // These four handlers used to have no session check at all, with no
    // middleware and nginx proxying /api/* unrestricted -- so every mutation
    // was reachable unauthenticated against the deployed origin: anyone who
    // could reach it could call students to Hadas, read their names and
    // reasons, or clear the board. The owner's call on #37 was to gate them
    // and accept the break for any non-browser caller.
    //
    // These are the assertions that were pinned as "succeeds with no session"
    // before the gate landed. They are the regression test for the fix: each
    // one fails on the pre-fix handlers.
    const refuses = async (response: Response, ...unreached: unknown[]) => {
        const { httpStatus, body } = await refusal(response);

        expect(httpStatus).toBe(401);
        expect(body.status).toBe(-1);
        expect(body.error?.name).toBe("UserNotLoggedInError");
        // The refusal must come *before* the side effect, not alongside it.
        for (const fn of unreached) {
            expect(fn).not.toHaveBeenCalled();
        }
    };

    beforeEach(() => signOut());

    it("GET refuses with no session", async () => {
        await refuses(await GET(new NextRequest(URL_)), getCallsToHadas);
    });

    it("PUT refuses with no session", async () => {
        const response = await PUT(
            jsonRequest("PUT", {
                students: [ STUDENTS[0] ],
                reason: "שיחה",
                expirationTime: "2026-09-19T12:00:00.000Z",
                groupCall: false,
            }),
        );

        await refuses(response, addStudentCallToHadas, addGroupCallToHadas);
    });

    it("DELETE refuses with no session", async () => {
        await refuses(
            await DELETE(jsonRequest("DELETE", { callId: "abc" })),
            removeCallToHadas,
        );
    });

    it("POST refuses with no session", async () => {
        await refuses(
            await POST(jsonRequest("POST", { callId: "abc", state: "הגיע" })),
            updateCallToHadasState,
        );
    });

    it("refuses a session that carries no user id", async () => {
        // The gate keys on session.user.id, matching /api/ws-ticket. A
        // half-built session is not an authenticated one, and accepting it
        // would mint board writes attributable to nobody.
        signInWithoutUserId();

        await refuses(
            await PUT(
                jsonRequest("PUT", {
                    students: [ STUDENTS[0] ],
                    reason: "שיחה",
                    expirationTime: "2026-09-19T12:00:00.000Z",
                    groupCall: false,
                }),
            ),
            addStudentCallToHadas,
        );
    });

    it("lets a signed-in caller through", async () => {
        // The gate has to be a gate, not a wall: the pre-fix suite would pass
        // vacuously against a handler that refused everyone.
        signIn();

        expect((await envelope(await GET(new NextRequest(URL_)))).status).toBe(0);
        expect(getCallsToHadas).toHaveBeenCalled();
    });
});
