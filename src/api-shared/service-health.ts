/**
 * Shared health contract for every service on the "מצב העולם" board.
 *
 * `degraded` means reachable but not well: slow responses, or the service itself
 * reporting a degraded dependency. It is distinct from `down` (unreachable/failing).
 */
export type ServiceHealthState = 'unconfigured' | 'up' | 'degraded' | 'down';

/** Sibling services rendered as generic tiles. */
export const MONITORED_SERVICE_IDS = [ 'bluz', 'peekaboo' ] as const;
export type MonitoredServiceId = typeof MONITORED_SERVICE_IDS[ number ];

/**
 * Every service the unified backend probes, in board order. Hive is probed too
 * (#54) but keeps its own tile for the helps gauge and toilet queue.
 */
export const HEALTH_SERVICE_IDS = [ 'hive', ...MONITORED_SERVICE_IDS ] as const;
export type HealthServiceId = typeof HEALTH_SERVICE_IDS[ number ];

export type ServiceHealthReason =
    /** Response time above the degraded threshold. */
    | 'slow'
    /** The service reported one of its own dependencies as degraded/down. */
    | 'dependency'
    /** Non-2xx, timeout, or network failure. */
    | 'unreachable'
    /** Hive's Prometheus reports a high concurrent query load. */
    | 'overloaded';

/** One probe on the latency-over-time graph; `latencyMs: null` = unreachable (a gap). */
export interface LatencySample
{
    at: number;
    latencyMs: number | null;
}

export interface ServiceHealth
{
    id: HealthServiceId;
    state: ServiceHealthState;
    /** Median latency over the recent probe window; null when never reached. */
    latencyMs: number | null;
    reason?: ServiceHealthReason;
    /** Per-dependency states as reported by the service itself, when it exposes them. */
    checks?: Record<string, 'up' | 'degraded' | 'down'>;
    /** Epoch ms of the probe this result is based on. */
    checkedAt: number;
    /** Recent probes, oldest first, for the latency-over-time graph. */
    history: LatencySample[];
}

/** Response from GET /api/status/services */
export type ServicesHealthResponse = ServiceHealth[];
