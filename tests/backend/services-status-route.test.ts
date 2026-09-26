import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth/next";
import { GET } from "@/app/api/status/services/route";

const request = () => new NextRequest("https://madash.test/api/status/services");

describe("GET /api/status/services", () => {
    beforeEach(() => {
        vi.mocked(getServerSession).mockReset();
        vi.stubEnv("BLUZ_URL", "");
        vi.stubEnv("PEEKABOO_URL", "");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it("rejects anonymous callers", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);
        const res = await GET(request());
        expect(res.type).toBe("error");
    });

    it("returns one entry per monitored service", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ expires: "" } as Session);
        const body = await (await GET(request())).json();
        expect(body.status).toBe(0);
        expect(body.data.map((s: { id: string; state: string; }) => [ s.id, s.state ])).toEqual([
            [ "bluz", "unconfigured" ],
            [ "peekaboo", "unconfigured" ],
        ]);
    });
});
