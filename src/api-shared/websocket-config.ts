const DEFAULT_WS_PROTOCOL = "ws";
const DEFAULT_WS_PORT_SUFFIX = ":28199";

/**
 * Fills in the WebSocket client's connection defaults. `??` rather than `||`
 * on purpose: an empty port suffix is a real value (the default HTTP(S) port,
 * reached through the proxy), and must not fall back to the raw session-server
 * port.
 */
export function resolveWebSocketClientConfig(config: {
    protocol?: string;
    portSuffix?: string;
}): { protocol: string; portSuffix: string; }
{
    return {
        protocol: config.protocol ?? DEFAULT_WS_PROTOCOL,
        portSuffix: config.portSuffix ?? DEFAULT_WS_PORT_SUFFIX,
    };
}
