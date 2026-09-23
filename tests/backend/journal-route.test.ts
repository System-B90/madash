import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/api-server/hive/sso", () => ({ authOptions: {} }));


import { GET, POST } from "@/app/api/journal/route";
import { refusal, signIn, signOut } from "./session-harness";

beforeEach(() => signIn());

async function envelope(response: Response)
{
    return (await response.json()) as { status: number; data?: any };
}

const get = (query: string) =>
    GET(new NextRequest(`https://madash.test/api/journal${query}`));

const post = (body: unknown) =>
    POST(
        new NextRequest("https://madash.test/api/journal", {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
        }),
    );

/** Pins the clock so "today" is deterministic. */
function freezeClock(iso: string)
{
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
}

afterEach(() => {
    vi.useRealTimers();
});

describe("GET /api/journal", () => {
    it("rejects a request with no date param", async () => {
        expect((await envelope(await get(""))).status).toBe(-1);
    });

    it("returns an empty shell for a date with no stored journal", async () => {
        // Persistence is commented out, so this is currently the only path.
        freezeClock("2026-09-19T10:00:00.000Z");

        const body = await envelope(await get("?date=2026-09-19"));

        expect(body.status).toBe(0);
        expect(body.data).toEqual({
            id: "",
            date: "2026-09-19",
            customName: "",
            tasks: [],
            isReadOnly: false,
        });
    });

    it("marks a past date read-only", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        expect((await envelope(await get("?date=2026-09-18"))).data.isReadOnly).toBe(true);
    });

    it("leaves today editable", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        expect((await envelope(await get("?date=2026-09-19"))).data.isReadOnly).toBe(false);
    });

    it("leaves a future date editable", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        expect((await envelope(await get("?date=2026-09-20"))).data.isReadOnly).toBe(false);
    });

    it("compares whole date strings, so year and month boundaries work", async () => {
        // The comparison is lexicographic on YYYY-MM-DD, which happens to be
        // chronologically correct for that format -- pinned so a switch to a
        // different format is caught.
        freezeClock("2027-01-01T10:00:00.000Z");

        expect((await envelope(await get("?date=2026-12-31"))).data.isReadOnly).toBe(true);
        expect((await envelope(await get("?date=2027-01-02"))).data.isReadOnly).toBe(false);
    });
});

describe("GET /api/journal timezone boundary", () => {
    // CHARACTERIZATION, NOT ENDORSEMENT -- see madash#31.
    //
    // "Today" is `new Date().toISOString().split('T')[0]`, i.e. the UTC day.
    // madash is a Jerusalem-local app (UTC+2 in winter, UTC+3 in summer), so
    // between local midnight and UTC midnight the server's "today" is still
    // *yesterday*. In that window the journal for the current local day is a
    // future date (fine), but the journal for the *previous* local day is
    // still treated as today and stays editable.
    //
    // Concretely: at 00:30 Jerusalem on the 20th (21:30 UTC on the 19th), the
    // 19th is still editable and the 20th is "future". A Jerusalem-local
    // comparison would flip both.
    //
    // These tests pin the current UTC behaviour so a move to Jerusalem-local
    // is a deliberate change with a failing test, not a silent one.
    it("treats the previous local day as still editable before UTC midnight", async () => {
        // 21:30 UTC on the 19th == 00:30 on the 20th in Jerusalem (UTC+3).
        freezeClock("2026-09-19T21:30:00.000Z");

        expect((await envelope(await get("?date=2026-09-19"))).data.isReadOnly).toBe(false);
    });

    it("treats the current local day as a future date before UTC midnight", async () => {
        freezeClock("2026-09-19T21:30:00.000Z");

        expect((await envelope(await get("?date=2026-09-20"))).data.isReadOnly).toBe(false);
    });

    it("flips to read-only once UTC rolls over", async () => {
        freezeClock("2026-09-20T00:30:00.000Z");

        expect((await envelope(await get("?date=2026-09-19"))).data.isReadOnly).toBe(true);
    });
});

describe("POST /api/journal", () => {
    it("rejects a body with no date", async () => {
        expect((await envelope(await post({ customName: "x" }))).status).toBe(-1);
    });

    it("rejects a write to a past date", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        const body = await envelope(await post({ date: "2026-09-18", tasks: [] }));

        expect(body.status).toBe(-1);
    });

    it("accepts a write to today", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        const body = await envelope(await post({ date: "2026-09-19", tasks: [] }));

        expect(body.status).toBe(0);
        expect(body.data.date).toBe("2026-09-19");
    });

    it("accepts a write to a future date", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        expect((await envelope(await post({ date: "2026-09-20", tasks: [] }))).status).toBe(0);
    });

    it("stamps completedAtTimestamp only for completed tasks", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        const body = await envelope(
            await post({
                date: "2026-09-19",
                tasks: [
                    { id: "a", title: "done", isCompleted: true },
                    { id: "b", title: "open", isCompleted: false },
                ],
            }),
        );

        expect(body.data.tasks[0].completedAtTimestamp).toBe("2026-09-19T10:00:00.000Z");
        expect(body.data.tasks[1].completedAtTimestamp).toBeUndefined();
    });

    it("overwrites a stale timestamp on a task that is no longer complete", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        const body = await envelope(
            await post({
                date: "2026-09-19",
                tasks: [
                    {
                        id: "a",
                        title: "reopened",
                        isCompleted: false,
                        completedAtTimestamp: "2026-09-01T00:00:00.000Z",
                    },
                ],
            }),
        );

        expect(body.data.tasks[0].completedAtTimestamp).toBeUndefined();
    });

    it("defaults id, customName and tasks when omitted", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        const body = await envelope(await post({ date: "2026-09-19" }));

        expect(body.data.id).toBe("new-id");
        expect(body.data.customName).toBe("");
        expect(body.data.tasks).toEqual([]);
    });

    it("always returns isReadOnly false on a successful write", async () => {
        freezeClock("2026-09-19T10:00:00.000Z");

        expect((await envelope(await post({ date: "2026-09-19" }))).data.isReadOnly).toBe(false);
    });

    it("returns the error envelope for a malformed body", async () => {
        const response = await POST(
            new NextRequest("https://madash.test/api/journal", {
                method: "POST",
                body: "{not json",
            }),
        );

        expect((await envelope(response)).status).toBe(-1);
    });
});

describe("auth gate (madash#30)", () => {
    // The journal had no session check either: its GET exposed the day's
    // tasks and its POST rewrote them, both unauthenticated. Gated on the
    // owner's call in #37; these assertions fail on the pre-fix handlers.
    beforeEach(() => signOut());

    it("GET refuses with no session", async () => {
        const { httpStatus, body } = await refusal(await get("?date=2026-09-20"));

        expect(httpStatus).toBe(401);
        expect(body.status).toBe(-1);
        expect(body.error?.name).toBe("UserNotLoggedInError");
    });

    it("POST refuses with no session", async () => {
        const { httpStatus, body } = await refusal(
            await post({ date: "2026-09-20", tasks: [] }),
        );

        expect(httpStatus).toBe(401);
        expect(body.status).toBe(-1);
    });

    it("refuses before the missing-date check", async () => {
        // Order matters: a caller with no session must not be able to probe
        // the handler's validation behaviour to learn what it accepts.
        const { httpStatus } = await refusal(await get(""));

        expect(httpStatus).toBe(401);
    });

    it("lets a signed-in caller through", async () => {
        signIn();

        expect((await envelope(await get("?date=2026-09-20"))).status).toBe(0);
    });
});
