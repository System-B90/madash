import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/next", () => ({
    getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth/next";
import { GET } from "@/app/api/status/hive-prometheus/route";

function makeRequest()
{
    return new NextRequest("https://madash.test/api/status/hive-prometheus");
}

function readyOk()
{
    return { ok: true } as Response;
}

function readyNotOk()
{
    return { ok: false } as Response;
}

function queryOk(body: any)
{
    return { ok: true, json: async () => body } as Response;
}

function queryNotOk()
{
    return { ok: false } as Response;
}

describe("GET /api/status/hive-prometheus", () => {
    beforeEach(() => {
        vi.mocked(getServerSession).mockReset();
        vi.stubEnv("HIVE_PROMETHEUS_URL", "https://prometheus.test");
        vi.stubEnv("HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD", "");
        vi.spyOn(globalThis, "fetch").mockImplementation(() => {
            return Promise.reject(new Error("fetch mock not configured"));
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it("returns an error response when there is no session", async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce(null as any);

        const response = await GET(makeRequest());
        expect(response.ok).toBe(false);
    });

    it("returns configured:false when HIVE_PROMETHEUS_URL is unset", async () => {
        vi.stubEnv("HIVE_PROMETHEUS_URL", "");
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);

        const response = await GET(makeRequest());
        const body = await response.json();
        expect(body.data).toEqual({ configured: false });
    });

    it("marks unreachable when the readiness probe is not ok", async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);
        vi.mocked(globalThis.fetch).mockResolvedValueOnce(readyNotOk());

        const response = await GET(makeRequest());
        const body = await response.json();
        expect(body.data).toEqual({ configured: true, reachable: false, overloaded: false });
    });

    it("marks reachable but not overloaded when the query probe is not ok", async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);
        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce(readyOk())
            .mockResolvedValueOnce(queryNotOk());

        const response = await GET(makeRequest());
        const body = await response.json();
        expect(body.data).toEqual({ configured: true, reachable: true, overloaded: false });
    });

    it("marks reachable but not overloaded on a malformed query body", async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);
        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce(readyOk())
            .mockResolvedValueOnce(queryOk({ status: "error" }));

        const response = await GET(makeRequest());
        const body = await response.json();
        expect(body.data).toEqual({ configured: true, reachable: true, overloaded: false });
    });

    it("marks reachable but not overloaded when the metric value is not numeric", async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);
        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce(readyOk())
            .mockResolvedValueOnce(
                queryOk({ status: "success", data: { result: [ { value: [ 0, "not-a-number" ] } ] } })
            );

        const response = await GET(makeRequest());
        const body = await response.json();
        expect(body.data).toEqual({ configured: true, reachable: true, overloaded: false });
    });

    it("marks overloaded when the metric meets the default threshold (20)", async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);
        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce(readyOk())
            .mockResolvedValueOnce(
                queryOk({ status: "success", data: { result: [ { value: [ 0, "20" ] } ] } })
            );

        const response = await GET(makeRequest());
        const body = await response.json();
        expect(body.data).toEqual({ configured: true, reachable: true, overloaded: true });
    });

    it("respects a custom overload threshold from the environment", async () => {
        vi.stubEnv("HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD", "5");
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);
        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce(readyOk())
            .mockResolvedValueOnce(
                queryOk({ status: "success", data: { result: [ { value: [ 0, "6" ] } ] } })
            );

        const response = await GET(makeRequest());
        const body = await response.json();
        expect(body.data).toEqual({ configured: true, reachable: true, overloaded: true });
    });

    it("falls back to the default threshold when the env value is invalid", async () => {
        vi.stubEnv("HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD", "not-a-number");
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);
        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce(readyOk())
            .mockResolvedValueOnce(
                queryOk({ status: "success", data: { result: [ { value: [ 0, "10" ] } ] } })
            );

        const response = await GET(makeRequest());
        const body = await response.json();
        // default threshold (20) applies since the env value doesn't parse -> 10 is not overloaded
        expect(body.data).toEqual({ configured: true, reachable: true, overloaded: false });
    });

    it("marks unreachable when the probe throws (e.g. timeout/abort)", async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: "token" } as any);
        vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("aborted"));

        const response = await GET(makeRequest());
        const body = await response.json();
        expect(body.data).toEqual({ configured: true, reachable: false, overloaded: false });
    });
});
