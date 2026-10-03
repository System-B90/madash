import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/api-server/service-health/monitor", () => ({ getServiceHealthMonitor: vi.fn() }));
vi.mock("@/api-server/hive/session-client", () => ({ createHiveClientFromSession: vi.fn() }));

import { getServerSession } from "next-auth/next";
import type { HiveClient } from "@/api-server/hive/client";
import { createHiveClientFromSession } from "@/api-server/hive/session-client";
import { applyHiveLoad, probeHivePrometheus } from "@/api-server/service-health/hive-load";
import { getServiceHealthMonitor, type ServiceHealthMonitor } from "@/api-server/service-health/monitor";
import { hiveInterpreter, MONITORED_SERVICES } from "@/api-server/service-health/registry";
import type { ServiceHealth } from "@/api-shared/service-health";
import { GET } from "@/app/api/status/services/route";

/** Hive in the unified service-health backend (#54). */

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const client = { fetchWithTokenCookie: fetchMock } as unknown as HiveClient;

const ready = (ok: boolean) => ({ ok }) as Response;
const query = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
const queries = (value: string) => query({ status: "success", data: { result: [ { value: [ 0, value ] } ] } });

const hive = (state: ServiceHealth[ "state" ]): ServiceHealth =>
    ({ id: "hive", state, latencyMs: state === "down" ? null : 40, checkedAt: 0, history: [] });

describe("probeHivePrometheus", () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubEnv("HIVE_PROMETHEUS_URL", "https://prometheus.test/");
        vi.stubEnv("HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD", "");
    });
    afterEach(() => vi.unstubAllEnvs());

    it("is unconfigured without HIVE_PROMETHEUS_URL", async () => {
        vi.stubEnv("HIVE_PROMETHEUS_URL", "");
        expect(await probeHivePrometheus(client)).toEqual({ configured: false });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("authenticates with the viewer's token cookie against the trimmed base", async () => {
        fetchMock.mockResolvedValueOnce(ready(true)).mockResolvedValueOnce(queries("1"));
        await probeHivePrometheus(client);
        expect(fetchMock.mock.calls.map(([ url ]) => url)).toEqual([
            "https://prometheus.test/-/ready",
            `https://prometheus.test/api/v1/query?query=${encodeURIComponent("sum(prometheus_engine_queries)")}`,
        ]);
    });

    it.each([
        [ "readiness fails", [ ready(false) ], { reachable: false, overloaded: false } ],
        [ "query fails", [ ready(true), query({}, false) ], { reachable: true, overloaded: false } ],
        [ "body is malformed", [ ready(true), query({ status: "error" }) ], { reachable: true, overloaded: false } ],
        [ "value is not numeric", [ ready(true), queries("nan?") ], { reachable: true, overloaded: false } ],
        [ "load meets the default threshold (20)", [ ready(true), queries("20") ], { reachable: true, overloaded: true } ],
        [ "load is under it", [ ready(true), queries("19") ], { reachable: true, overloaded: false } ],
    ])("when %s", async (_, responses, expected) => {
        for (const r of responses) fetchMock.mockResolvedValueOnce(r);
        expect(await probeHivePrometheus(client)).toEqual({ configured: true, ...expected });
    });

    it("honours a custom threshold and ignores an invalid one", async () => {
        vi.stubEnv("HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD", "5");
        fetchMock.mockResolvedValueOnce(ready(true)).mockResolvedValueOnce(queries("6"));
        expect(await probeHivePrometheus(client)).toMatchObject({ overloaded: true });

        vi.stubEnv("HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD", "junk");
        fetchMock.mockResolvedValueOnce(ready(true)).mockResolvedValueOnce(queries("10"));
        expect(await probeHivePrometheus(client)).toMatchObject({ overloaded: false });
    });

    it("is unreachable when the probe throws", async () => {
        fetchMock.mockRejectedValueOnce(new Error("aborted"));
        expect(await probeHivePrometheus(client)).toEqual({ configured: true, reachable: false, overloaded: false });
    });
});

describe("applyHiveLoad", () => {
    const overloaded = { configured: true, reachable: true, overloaded: true } as const;

    it("degrades an up Hive when Prometheus is overloaded", () => {
        expect(applyHiveLoad(hive("up"), overloaded)).toMatchObject({ state: "degraded", reason: "overloaded", latencyMs: 40 });
    });

    it("leaves Hive alone when Prometheus is calm, unreachable or unconfigured", () => {
        const up = hive("up");
        expect(applyHiveLoad(up, { configured: true, reachable: true, overloaded: false })).toBe(up);
        expect(applyHiveLoad(up, { configured: true, reachable: false, overloaded: false })).toBe(up);
        expect(applyHiveLoad(up, { configured: false })).toBe(up);
    });

    it("never turns a down Hive into degraded", () => {
        const down = hive("down");
        expect(applyHiveLoad(down, overloaded)).toBe(down);
    });
});

describe("Hive registry entry", () => {
    it("is probed first, via HIVE_URL with the public URL as fallback", () => {
        const [ first ] = MONITORED_SERVICES;
        expect(first.id).toBe("hive");
        expect(first.baseUrlEnv).toEqual([ "HIVE_URL", "NEXT_PUBLIC_HIVE_URL" ]);
    });

    it("counts any non-5xx answer as alive (the probe is unauthenticated)", () => {
        expect(hiveInterpreter(200, null).state).toBe("up");
        expect(hiveInterpreter(401, null).state).toBe("up");
        expect(hiveInterpreter(403, null).state).toBe("up");
        expect(hiveInterpreter(502, null).state).toBe("down");
    });
});

describe("GET /api/status/services Hive overlay", () => {
    const sibling: ServiceHealth = { id: "bluz", state: "up", latencyMs: 80, checkedAt: 0, history: [] };
    const serve = (services: ServiceHealth[]) => vi.mocked(getServiceHealthMonitor)
        .mockReturnValue({ getAll: async () => services } as unknown as ServiceHealthMonitor);
    const request = () => new NextRequest("https://madash.test/api/status/services");

    beforeEach(() => {
        fetchMock.mockReset();
        vi.mocked(createHiveClientFromSession).mockReset();
        vi.mocked(getServerSession).mockResolvedValue({ expires: "" } as Session);
        vi.mocked(createHiveClientFromSession).mockResolvedValue(client);
        vi.stubEnv("HIVE_PROMETHEUS_URL", "https://prometheus.test");
    });
    afterEach(() => vi.unstubAllEnvs());

    it("overlays this viewer's Prometheus load onto the shared Hive result", async () => {
        serve([ hive("up"), sibling ]);
        fetchMock.mockResolvedValueOnce(ready(true)).mockResolvedValueOnce(queries("50"));
        const body = await (await GET(request())).json();
        expect(body.data.map((s: ServiceHealth) => [ s.id, s.state, s.reason ])).toEqual([
            [ "hive", "degraded", "overloaded" ],
            [ "bluz", "up", undefined ],
        ]);
    });

    it("skips the authenticated probe when Hive is not up", async () => {
        serve([ hive("down"), sibling ]);
        const body = await (await GET(request())).json();
        expect(body.data[ 0 ].state).toBe("down");
        expect(createHiveClientFromSession).not.toHaveBeenCalled();
    });
});
