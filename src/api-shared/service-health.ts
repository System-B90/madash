/**
 * Shared health contract for every service on the "מצב העולם" board.
 *
 * `degraded` means reachable but not well: slow responses, or the service itself
 * reporting a degraded dependency. It is distinct from `down` (unreachable/failing).
 */
export type ServiceHealthState = 'unconfigured' | 'up' | 'degraded' | 'down';

/** Services probed by the unified backend (Hive is monitored separately). */
export const MONITORED_SERVICE_IDS = [ 'bluz', 'peekaboo' ] as const;
export type MonitoredServiceId = typeof MONITORED_SERVICE_IDS[ number ];

export type ServiceHealthReason =
    /** Response time above the degraded threshold. */
    | 'slow'
    /** The service reported one of its own dependencies as degraded/down. */
    | 'dependency'
    /** Non-2xx, timeout, or network failure. */
    | 'unreachable';

/** One probe on the latency-over-time graph; `latencyMs: null` = unreachable (a gap). */
export interface LatencySample
{
    at: number;
    latencyMs: number | null;
}

export interface ServiceHealth
{
    id: MonitoredServiceId;
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
