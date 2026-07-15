import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({
    getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import { GET } from "@/app/api/avatars/[slug]/route";

function makeRequest()
{
    return new NextRequest("https://madash.test/api/avatars/42");
}

function makeParams(slug: string)
{
    return { params: Promise.resolve({ slug }) };
}

describe("GET /api/avatars/[slug]", () => {
    beforeEach(() => {
        vi.mocked(getToken).mockReset();
        vi.spyOn(globalThis, "fetch").mockImplementation(() => {
            return Promise.reject(new Error("fetch mock not configured"));
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns 401 when there is no token", async () => {
        vi.mocked(getToken).mockResolvedValueOnce(null);

        const response = await GET(makeRequest(), makeParams("42"));
        expect(response.status).toBe(401);
    });

    it("returns 401 when the token has no access token", async () => {
        vi.mocked(getToken).mockResolvedValueOnce({ data: {} } as any);

        const response = await GET(makeRequest(), makeParams("42"));
        expect(response.status).toBe(401);
    });

    it("passes through the upstream status/statusText when Hive responds with an error", async () => {
        vi.mocked(getToken).mockResolvedValueOnce({ data: { accessToken: "token-123" } } as any);
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: "Not Found",
        } as Response);

        const response = await GET(makeRequest(), makeParams("42"));
        expect(response.status).toBe(404);
    });

    it("returns the image bytes and content type on success", async () => {
        vi.mocked(getToken).mockResolvedValueOnce({ data: { accessToken: "token-123" } } as any);
        const imageBytes = new Uint8Array([ 1, 2, 3 ]).buffer;
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => imageBytes,
            headers: new Headers({ "Content-Type": "image/png" }),
        } as unknown as Response);

        const response = await GET(makeRequest(), makeParams("42"));
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/png");
    });

    it("returns 500 when the upstream fetch throws", async () => {
        vi.mocked(getToken).mockResolvedValueOnce({ data: { accessToken: "token-123" } } as any);
        vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("network down"));

        const response = await GET(makeRequest(), makeParams("42"));
        expect(response.status).toBe(500);
    });
});
