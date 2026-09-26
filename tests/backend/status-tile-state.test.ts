import { describe, expect, it } from "vitest";

import { hiveTileState } from "@/components/system-status-board/hive-health-row";
import { madashLinkState } from "@/components/system-status-board/madash-link-row";
import { formatLatency } from "@/components/system-status-board/shared-ui";

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
