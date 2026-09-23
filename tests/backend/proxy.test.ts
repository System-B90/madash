import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }));

import { getToken } from "next-auth/jwt";

import { config, proxy } from "@/proxy";

const request = (path: string) => new NextRequest(`https://madash.test${path}`);

function withToken(token: unknown)
{
    vi.mocked(getToken).mockResolvedValue(token as never);
}

beforeEach(() => {
    vi.mocked(getToken).mockReset();
    withToken({ sub: "hive-user-1" });
});

describe("api auth proxy (madash#30)", () => {
    it("matches every /api path", () => {
        // The matcher is the whole protection. A typo here silently unguards
        // every route, which is exactly the failure mode the per-route gates
        // exist to survive -- so it is asserted rather than assumed.
        expect(config.matcher).toContain("/api/:path*");
    });

    it("refuses an unauthenticated request with a 401 envelope", async () => {
        withToken(null);

        const response = await proxy(request("/api/call-to-hadas"));
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.status).toBe(-1);
        expect(body.error.name).toBe("UserNotLoggedInError");
    });

    it("lets an authenticated request continue", async () => {
        const response = await proxy(request("/api/call-to-hadas"));

        expect(response.status).toBe(200);
        // NextResponse.next() marks itself for the router rather than
        // answering the request; a 401 body would mean the gate swallowed it.
        expect(response.headers.get("x-middleware-next")).toBe("1");
    });

    it("never gates NextAuth's own endpoints", async () => {
        // Gating /api/auth would make logging in impossible: the sign-in
        // callback is itself an unauthenticated request by definition.
        withToken(null);

        for (const path of [ "/api/auth/signin", "/api/auth/callback/hive", "/api/auth/session" ]) {
            const response = await proxy(request(path));
            expect(response.status).toBe(200);
            expect(response.headers.get("x-middleware-next")).toBe("1");
        }
    });

    it("does not treat a lookalike path as public", async () => {
        // "/api/authors" starts with "/api/auth" as a string, so a bare
        // startsWith check would hand it through unauthenticated. The prefix
        // match is boundary-aware for exactly this reason.
        withToken(null);

        for (const path of [ "/api/authors", "/api/authenticate", "/api/authx/y" ]) {
            const response = await proxy(request(path));
            expect(response.status).toBe(401);
        }
    });
});
