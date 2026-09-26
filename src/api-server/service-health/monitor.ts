import { LatencyHistory, LatencyWindow } from '@/api-server/service-health/latency-window';
import { DEFAULT_PROBE_TIMEOUT_MS, probeHealthUrl } from '@/api-server/service-health/probe';
import { healthUrlFor, MONITORED_SERVICES, type MonitoredServiceDefinition } from '@/api-server/service-health/registry';
import type { ServiceHealth } from '@/api-shared/service-health';

export interface ServiceHealthMonitorOptions
{
    /** Median latency at/above which a reachable service counts as degraded. */
    degradedLatencyMs: number;
    /** Results are shared by every viewer for this long, so N open boards ≠ N× probe load. */
    cacheTtlMs: number;
    timeoutMs: number;
    now: () => number;
}

function positiveIntEnv(name: string, fallback: number): number
{
    const n = parseInt(process.env[ name ] ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function defaultMonitorOptions(): ServiceHealthMonitorOptions
{
    return {
        degradedLatencyMs: positiveIntEnv('SERVICE_HEALTH_DEGRADED_LATENCY_MS', 1500),
        cacheTtlMs: 10_000,
        timeoutMs: DEFAULT_PROBE_TIMEOUT_MS,
        now: Date.now,
    };
}

/**
 * Probes every monitored service in parallel and classifies each as
 * up / degraded / down / unconfigured. State is in-process only (madash is stateless).
 */
export class ServiceHealthMonitor
{
    private readonly trackers = new Map<string, { window: LatencyWindow; history: LatencyHistory; }>();
    private cached: { at: number; result: ServiceHealth[]; } | null = null;
    private inFlight: Promise<ServiceHealth[]> | null = null;

    constructor(
        private readonly services: readonly MonitoredServiceDefinition[],
        private readonly options: ServiceHealthMonitorOptions,
    ) { }

    async getAll(): Promise<ServiceHealth[]>
    {
        const now = this.options.now();
        if (this.cached && now - this.cached.at < this.options.cacheTtlMs) return this.cached.result;

        // Concurrent viewers share one round of probes.
        this.inFlight ??= Promise.all(this.services.map((s) => this.check(s)))
            .then((result) =>
            {
                this.cached = { at: this.options.now(), result };
                return result;
            })
            .finally(() => { this.inFlight = null; });
        return this.inFlight;
    }

    private trackerFor(id: string)
    {
        let t = this.trackers.get(id);
        if (!t) this.trackers.set(id, t = { window: new LatencyWindow(), history: new LatencyHistory() });
        return t;
    }

    private async check(def: MonitoredServiceDefinition): Promise<ServiceHealth>
    {
        const url = healthUrlFor(def);
        const checkedAt = this.options.now();
        if (!url) return { id: def.id, state: 'unconfigured', latencyMs: null, checkedAt, history: [] };

        const { window, history } = this.trackerFor(def.id);
        const probe = await probeHealthUrl(url, def.interpret, this.options.timeoutMs);
        const failed = !probe.reached || probe.verdict.state === 'down';
        history.push({ at: checkedAt, latencyMs: failed ? null : probe.latencyMs });

        if (failed)
        {
            // A recovered service should be judged on fresh samples, not pre-outage ones.
            window.clear();
            return {
                id: def.id,
                state: 'down',
                latencyMs: null,
                reason: probe.verdict.checks ? 'dependency' : 'unreachable',
                checks: probe.verdict.checks,
                checkedAt,
                history: history.snapshot(),
            };
        }

        window.push(probe.latencyMs);
        const latencyMs = window.median();
        const base = { id: def.id, latencyMs, checks: probe.verdict.checks, checkedAt, history: history.snapshot() };

        if (probe.verdict.state === 'degraded') return { ...base, state: 'degraded', reason: 'dependency' };
        if (latencyMs !== null && latencyMs >= this.options.degradedLatencyMs) return { ...base, state: 'degraded', reason: 'slow' };
        return { ...base, state: 'up' };
    }
}

let monitor: ServiceHealthMonitor | null = null;

export function getServiceHealthMonitor(): ServiceHealthMonitor
{
    return monitor ??= new ServiceHealthMonitor(MONITORED_SERVICES, defaultMonitorOptions());
}
