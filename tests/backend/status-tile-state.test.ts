import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MONITORED_SERVICE_IDS, type ServiceHealth } from "@/api-shared/service-health";
import { compactStatuses } from "@/components/system-status-board";
import { compactDotPalette } from "@/components/system-status-board/compact-status-strip";
import { hiveTileState } from "@/components/system-status-board/hive-health-row";
import { madashLinkState } from "@/components/system-status-board/madash-link-row";
import { formatProbeTime, sparklinePaletteKey, sparklineSeries } from "@/components/system-status-board/latency-sparkline";
import {
    allServicesUnreachable,
    dependencyChecksTooltip,
    describeServiceHealth,
} from "@/components/system-status-board/service-health-text";
import { DEFAULT_STATE_DETAIL, formatLatency } from "@/components/system-status-board/shared-ui";
import { startPolling } from "@/components/system-status-board/use-polling";

describe("hiveTileState", () => {
    it("maps the Prometheus probe onto the shared tile states", () => {
        expect(hiveTileState(null)).toBe("loading");
        expect(hiveTileState({ configured: false })).toBe("unconfigured");
        expect(hiveTileState({ configured: true, reachable: false, overloaded: false })).toBe("down");
        expect(hiveTileState({ configured: true, reachable: true, overloaded: true })).toBe("degraded");
        expect(hiveTileState({ configured: true, reachable: true, overloaded: false })).toBe("up");
    });
});

describe("madashLinkState", () => {
    it("judges the WebSocket link on silence and round-trip time", () => {
        expect(madashLinkState(500, 40)).toBe("up");
        expect(madashLinkState(500, 1200)).toBe("degraded");
        expect(madashLinkState(3000, null)).toBe("degraded");
        expect(madashLinkState(6000, 40)).toBe("down");
    });
});

describe("formatLatency", () => {
    it("uses ms below a second and seconds above", () => {
        expect(formatLatency(87)).toBe("87ms");
        expect(formatLatency(1530)).toBe("1.5s");
    });
});

describe("service tile text", () => {
    const base: ServiceHealth = { id: "bluz", state: "up", latencyMs: 80, checkedAt: 0, history: [] };

    it("uses the default detail for a healthy service", () => {
        expect(describeServiceHealth(base)).toBe(DEFAULT_STATE_DETAIL.up);
    });

    it("names slowness as the cause", () => {
        expect(describeServiceHealth({ ...base, state: "degraded", reason: "slow" })).toBe("זמן תגובה ארוך מהרגיל");
    });

    it("names the failing dependencies, in Hebrew where known", () => {
        const h: ServiceHealth = { ...base, state: "degraded", reason: "dependency", checks: { mongodb: "up", hive: "degraded", redis: "down" } };
        expect(describeServiceHealth(h)).toBe("תקלה ב־הייב, redis");
    });

    it("falls back to the state detail when a dependency reason has no failing checks", () => {
        expect(describeServiceHealth({ ...base, state: "down", reason: "dependency" })).toBe(DEFAULT_STATE_DETAIL.down);
    });

    it("lists every reported dependency in the glyph tooltip", () => {
        expect(dependencyChecksTooltip(base)).toBeUndefined();
        expect(dependencyChecksTooltip({ ...base, checks: { postgres: "up", hive: "down" } })).toBe("Postgres: תקין · הייב: לא זמין");
    });

    it("marks every monitored service unreachable when the route itself fails", () => {
        const all = allServicesUnreachable(42);
        expect(all.map((s) => s.id)).toEqual([ ...MONITORED_SERVICE_IDS ]);
        expect(all.every((s) => s.state === "down" && s.reason === "unreachable" && s.checkedAt === 42 && s.history.length === 0)).toBe(true);
    });
});

describe("latency sparkline helpers", () => {
    it("colours the line by tile state", () => {
        expect(sparklinePaletteKey("down")).toBe("error");
        expect(sparklinePaletteKey("degraded")).toBe("warning");
        expect(sparklinePaletteKey("up")).toBe("success");
        expect(sparklinePaletteKey("loading")).toBe("success");
    });

    it("keeps outages as null gaps and times as the x axis", () => {
        expect(sparklineSeries([ { at: 1, latencyMs: 50 }, { at: 2, latencyMs: null } ])).toEqual({ data: [ 50, null ], times: [ 1, 2 ] });
    });

    // Regression: the tooltip header showed the raw epoch-ms x value.
    it("formats the probe time as a clock time, not epoch ms", () => {
        const at = new Date(2026, 8, 26, 23, 41, 2).getTime();
        const text = formatProbeTime(at);
        expect(text).toMatch(/23:41:02/);
        expect(text).not.toContain(String(at));
    });
});

describe("startPolling", () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it("fetches immediately and then on every interval", async () => {
        let n = 0;
        const values: number[] = [];
        const stop = startPolling(async () => ++n, 1000, () => -1, (v) => values.push(v));
        await vi.advanceTimersByTimeAsync(0);
        expect(values).toEqual([ 1 ]);
        await vi.advanceTimersByTimeAsync(2000);
        expect(values).toEqual([ 1, 2, 3 ]);
        stop();
    });

    it("maps a rejected fetch through onError instead of stalling", async () => {
        const values: string[] = [];
        const stop = startPolling(async () => { throw new Error("x"); }, 1000, () => "fallback", (v) => values.push(v));
        await vi.advanceTimersByTimeAsync(0);
        expect(values).toEqual([ "fallback" ]);
        stop();
    });

    it("delivers nothing after stop, even for an in-flight fetch", async () => {
        let resolve!: (v: number) => void;
        const values: number[] = [];
        const stop = startPolling(() => new Promise<number>((r) => { resolve = r; }), 1000, () => -1, (v) => values.push(v));
        stop();
        resolve(7);
        await vi.advanceTimersByTimeAsync(5000);
        expect(values).toEqual([]);
    });
});

describe("collapsed status strip", () => {
    it("maps states to a status dot colour, neutral while unknown", () => {
        expect(compactDotPalette("up")).toBe("success");
        expect(compactDotPalette("degraded")).toBe("warning");
        expect(compactDotPalette("down")).toBe("error");
        expect(compactDotPalette("loading")).toBeNull();
        expect(compactDotPalette("unconfigured")).toBeNull();
    });

    it("summarises all four services in board order, loading until the backend answers", () => {
        const link = { state: "up" as const, rttMs: 20, history: [] };
        const hive = { state: "degraded" as const, detail: "", helps: 0, helpsLoading: false };
        const pending = compactStatuses({ link, hive, services: null });
        expect(pending.map((s) => [ s.id, s.state ])).toEqual([
            [ "madash", "up" ], [ "hive", "degraded" ], [ "bluz", "loading" ], [ "peekaboo", "loading" ],
        ]);

        const services: ServiceHealth[] = [
            { id: "bluz", state: "up", latencyMs: 80, checkedAt: 0, history: [] },
            { id: "peekaboo", state: "down", latencyMs: null, checkedAt: 0, history: [] },
        ];
        expect(compactStatuses({ link, hive, services }).slice(2).map((s) => s.state)).toEqual([ "up", "down" ]);
    });
});
