import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RingBuffer } from "@/api-shared/ring-buffer";
import { LatencyHistory, LatencyWindow } from "@/api-server/service-health/latency-window";
import { ServiceHealthMonitor, type ServiceHealthMonitorOptions } from "@/api-server/service-health/monitor";
import { livenessInterpreter, probeHealthUrl } from "@/api-server/service-health/probe";
import { bluzInterpreter, type MonitoredServiceDefinition } from "@/api-server/service-health/registry";

function jsonResponse(status: number, body: unknown)
{
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const BLUZ: MonitoredServiceDefinition = { id: "bluz", baseUrlEnv: "BLUZ_URL", healthPath: "/api/health", interpret: bluzInterpreter };
const PAB: MonitoredServiceDefinition = { id: "peekaboo", baseUrlEnv: "PEEKABOO_URL", healthPath: "/api/health", interpret: livenessInterpreter };

describe("RingBuffer", () => {
    it("overwrites the oldest item once full, keeping capacity fixed", () => {
        const r = new RingBuffer<number>(3);
        for (let i = 1; i <= 7; i++) r.push(i);
        expect(r.size).toBe(3);
        expect(r.toArray()).toEqual([ 5, 6, 7 ]);
        r.clear();
        expect(r.toArray()).toEqual([]);
        r.push(9);
        expect(r.toArray()).toEqual([ 9 ]);
    });

    it("rejects a non-positive capacity", () => {
        expect(() => new RingBuffer(0)).toThrow(RangeError);
    });
});

describe("LatencyWindow", () => {
    it("returns null when empty and the median otherwise", () => {
        const w = new LatencyWindow(3);
        expect(w.median()).toBeNull();
        w.push(10); w.push(1000); w.push(20);
        expect(w.median()).toBe(20);
        w.push(30); // evicts 10 → [1000, 20, 30]
        expect(w.median()).toBe(30);
        w.clear();
        expect(w.median()).toBeNull();
    });

    it("averages the two middle samples on an even count", () => {
        const w = new LatencyWindow(4);
        [ 10, 20, 30, 40 ].forEach((n) => w.push(n));
        expect(w.median()).toBe(25);
    });
});

describe("LatencyHistory", () => {
    it("keeps the newest samples, oldest first", () => {
        const h = new LatencyHistory(2);
        h.push({ at: 1, latencyMs: 10 }); h.push({ at: 2, latencyMs: null }); h.push({ at: 3, latencyMs: 30 });
        expect(h.snapshot()).toEqual([ { at: 2, latencyMs: null }, { at: 3, latencyMs: 30 } ]);
    });
});

describe("interpreters", () => {
    it("liveness treats only 2xx as up", () => {
        expect(livenessInterpreter(200, null).state).toBe("up");
        expect(livenessInterpreter(503, null).state).toBe("down");
    });

    it("bluz maps its report statuses and keeps dependency checks", () => {
        const checks = { mongodb: "up", postgres: "up", hive: "degraded" } as const;
        expect(bluzInterpreter(200, { status: "healthy", checks })).toEqual({ state: "up", checks });
        expect(bluzInterpreter(200, { status: "degraded", checks })).toEqual({ state: "degraded", checks });
        expect(bluzInterpreter(503, { status: "unhealthy", checks }).state).toBe("down");
    });

    it("bluz falls back to liveness for an unexpected body", () => {
        expect(bluzInterpreter(200, "not json").state).toBe("up");
    });
});

describe("probeHealthUrl", () => {
    afterEach(() => vi.restoreAllMocks());

    it("never throws on network failure", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
        const r = await probeHealthUrl("https://x.test/api/health", livenessInterpreter);
        expect(r.reached).toBe(false);
        expect(r.verdict.state).toBe("down");
    });

    it("tolerates a non-JSON body", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
        const r = await probeHealthUrl("https://x.test/api/health", livenessInterpreter);
        expect(r.reached).toBe(true);
        expect(r.verdict.state).toBe("up");
    });
});

describe("ServiceHealthMonitor", () => {
    let clock = 0;
    const options = (overrides: Partial<ServiceHealthMonitorOptions> = {}): ServiceHealthMonitorOptions => ({
        degradedLatencyMs: 1500, cacheTtlMs: 10_000, timeoutMs: 1000, now: () => clock, ...overrides,
    });

    beforeEach(() => {
        clock = 0;
        vi.stubEnv("BLUZ_URL", "https://bluz.test/");
        vi.stubEnv("PEEKABOO_URL", "https://peekaboo.test");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it("reports unconfigured services without probing them", async () => {
        vi.stubEnv("BLUZ_URL", "");
        const fetchSpy = vi.spyOn(globalThis, "fetch");
        const [ bluz ] = await new ServiceHealthMonitor([ BLUZ ], options()).getAll();
        expect(bluz.state).toBe("unconfigured");
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("probes each service's health URL and reports them up", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
            String(url).includes("bluz")
                ? jsonResponse(200, { status: "healthy", checks: { mongodb: "up" } })
                : jsonResponse(200, { status: "ok" }));

        const result = await new ServiceHealthMonitor([ BLUZ, PAB ], options()).getAll();

        expect(fetchSpy.mock.calls.map(([ u ]) => String(u)).sort()).toEqual([
            "https://bluz.test/api/health",
            "https://peekaboo.test/api/health",
        ]);
        expect(result.map((s) => [ s.id, s.state ])).toEqual([ [ "bluz", "up" ], [ "peekaboo", "up" ] ]);
        expect(result[ 0 ].checks).toEqual({ mongodb: "up" });
        expect(result[ 0 ].latencyMs).not.toBeNull();
    });

    it("marks an unreachable service down", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("timeout"));
        const [ pab ] = await new ServiceHealthMonitor([ PAB ], options()).getAll();
        expect(pab).toMatchObject({ state: "down", reason: "unreachable", latencyMs: null });
    });

    it("records every probe in the history, outages as gaps", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(200, {}));
        const monitor = new ServiceHealthMonitor([ PAB ], options({ cacheTtlMs: 0 }));
        await monitor.getAll();
        fetchSpy.mockRejectedValueOnce(new Error("down"));
        clock = 1;
        const [ pab ] = await monitor.getAll();
        expect(pab.history).toHaveLength(2);
        expect(pab.history[ 0 ].latencyMs).not.toBeNull();
        expect(pab.history[ 1 ]).toEqual({ at: 1, latencyMs: null });
    });

    it("marks a service reporting a degraded dependency as degraded", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, { status: "degraded", checks: { hive: "degraded" } }));
        const [ bluz ] = await new ServiceHealthMonitor([ BLUZ ], options()).getAll();
        expect(bluz).toMatchObject({ state: "degraded", reason: "dependency" });
    });

    it("marks a slow-but-answering service degraded", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, { status: "ok" }));
        // Threshold 0 → any measured latency counts as slow.
        const [ pab ] = await new ServiceHealthMonitor([ PAB ], options({ degradedLatencyMs: 0 })).getAll();
        expect(pab).toMatchObject({ state: "degraded", reason: "slow" });
    });

    it("serves cached results within the TTL and re-probes after it", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(200, {}));
        const monitor = new ServiceHealthMonitor([ PAB ], options());

        await monitor.getAll();
        clock = 5_000;
        await monitor.getAll();
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        clock = 10_001;
        await monitor.getAll();
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("shares one round of probes between concurrent callers", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(200, {}));
        const monitor = new ServiceHealthMonitor([ PAB ], options());
        await Promise.all([ monitor.getAll(), monitor.getAll(), monitor.getAll() ]);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
});
