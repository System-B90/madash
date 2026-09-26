import { describe, expect, it } from "vitest";
import { resolveWebSocketClientConfig } from "@/api-shared/websocket-config";

describe("resolveWebSocketClientConfig", () => {
    it("keeps an empty port suffix instead of falling back to the raw session-server port", () => {
        // Regression: with WEBSOCKET_SESSION_SERVER_PORT=443 the suffix is "", and
        // `||` turned it into ":28199", so the browser bypassed the proxy's /ws/
        // route and every WebSocket connection failed.
        const config = resolveWebSocketClientConfig({ protocol: "wss", portSuffix: "" });
        expect(config).toEqual({ protocol: "wss", portSuffix: "" });
    });

    it("keeps an explicit port suffix", () => {
        expect(resolveWebSocketClientConfig({ protocol: "ws", portSuffix: ":1234" }))
            .toEqual({ protocol: "ws", portSuffix: ":1234" });
    });

    it("falls back to defaults only when the values are missing", () => {
        expect(resolveWebSocketClientConfig({})).toEqual({ protocol: "ws", portSuffix: ":28199" });
    });
});
