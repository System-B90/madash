import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    allowRedeemAttempt,
    CLI_HANDOFF_TTL_SECONDS,
    createHandoffCode,
    redeemHandoffCode,
    resetCliHandoffState,
} from "@/api-server/cli-handoff";
import { safeCallbackUrl } from "@/api-shared/callback-url";
import { POST } from "@/app/api/cli-auth/redeem/route";

function redeemRequest(body: unknown, ip = "10.0.0.1")
{
    return new NextRequest("https://madash.test/api/cli-auth/redeem", {
        body: typeof body === "string" ? body : JSON.stringify(body),
        headers: { "x-forwarded-for": ip },
        method: "POST",
    });
}

async function envelope(response: Response)
{
    return (await response.json()) as { status: number; data?: { token: string; }; };
}

describe("cli handoff codes", () =>
{
    beforeEach(() => resetCliHandoffState());
    afterEach(() => vi.useRealTimers());

    it("redeems a code for the token it was minted for", () =>
    {
        const code = createHandoffCode("session-token");

        expect(code).not.toContain("session-token");
        expect(redeemHandoffCode(code)).toBe("session-token");
    });

    it("is single-use", () =>
    {
        const code = createHandoffCode("session-token");
        redeemHandoffCode(code);

        expect(() => redeemHandoffCode(code)).toThrow(/already-used/);
    });

    it("refuses an expired code", () =>
    {
        vi.useFakeTimers();
        const code = createHandoffCode("session-token");
        vi.advanceTimersByTime((CLI_HANDOFF_TTL_SECONDS + 1) * 1000);

        expect(() => redeemHandoffCode(code)).toThrow(/expired/);
    });

    it("rate-limits redeem attempts per caller", () =>
    {
        for (let i = 0; i < 20; i++)
        {
            expect(allowRedeemAttempt("1.2.3.4")).toBe(true);
        }
        expect(allowRedeemAttempt("1.2.3.4")).toBe(false);
        expect(allowRedeemAttempt("5.6.7.8")).toBe(true);
    });
});

describe("POST /api/cli-auth/redeem", () =>
{
    beforeEach(() => resetCliHandoffState());

    it("answers the token in the response envelope", async () =>
    {
        const code = createHandoffCode("session-token");

        const body = await envelope(await POST(redeemRequest({ code })));

        expect(body).toEqual({ data: { token: "session-token" }, status: 0 });
    });

    it("rejects unknown codes and malformed bodies", async () =>
    {
        expect((await envelope(await POST(redeemRequest({ code: "nope" })))).status).toBe(-1);
        expect((await envelope(await POST(redeemRequest({})))).status).toBe(-1);
        expect((await envelope(await POST(redeemRequest("not json")))).status).toBe(-1);
    });

    it("stops answering after too many attempts", async () =>
    {
        const code = createHandoffCode("session-token");
        for (let i = 0; i < 20; i++)
        {
            await POST(redeemRequest({ code: `guess-${ i }` }, "9.9.9.9"));
        }

        const body = await envelope(await POST(redeemRequest({ code }, "9.9.9.9")));

        expect(body.status).toBe(-1);
        expect(redeemHandoffCode(code)).toBe("session-token");
    });
});

describe("safeCallbackUrl", () =>
{
    it("keeps same-origin paths", () =>
    {
        expect(safeCallbackUrl("/cli-auth?port=52400&code=ABCD-EFGH")).toBe(
            "/cli-auth?port=52400&code=ABCD-EFGH",
        );
    });

    it.each([ null, "", "https://evil.test/", "//evil.test", "/\\evil.test", "journal" ])(
        "falls back to the dashboard for %j",
        (value) =>
        {
            expect(safeCallbackUrl(value)).toBe("/");
        },
    );
});
