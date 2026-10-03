import type { HiveClient } from '@/api-server/hive/client';
import type { HivePrometheusStatus } from '@/api-shared/hive-prometheus-status';
import type { ServiceHealth } from '@/api-shared/service-health';

const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_OVERLOAD_THRESHOLD = 20;

function overloadThreshold(): number
{
    const n = parseInt(process.env.HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_OVERLOAD_THRESHOLD;
}

/** Reads `sum(prometheus_engine_queries)`; null when the body has no usable number. */
async function concurrentQueries(res: Response): Promise<number | null>
{
    const body = (await res.json()) as {
        status?: string;
        data?: { result?: Array<{ value?: [ number, string ]; }>; };
    };
    if (body.status !== 'success' || !body.data?.result?.length) return null;
    const n = parseFloat(String(body.data.result[ 0 ]?.value?.[ 1 ]));
    return Number.isNaN(n) ? null : n;
}

/**
 * Hive's Prometheus: readiness, then whether its concurrent query load is over
 * the threshold. Authenticated with the viewer's Hive token cookie, so it runs
 * per request and is never cached across viewers.
 */
export async function probeHivePrometheus(hiveClient: HiveClient): Promise<HivePrometheusStatus>
{
    const raw = process.env.HIVE_PROMETHEUS_URL?.trim();
    if (!raw) return { configured: false };
    const base = raw.replace(/\/$/, '');

    try
    {
        const readyRes = await hiveClient.fetchWithTokenCookie(`${base}/-/ready`, {
            method: 'GET',
            headers: { Accept: 'text/plain, application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!readyRes.ok) return { configured: true, reachable: false, overloaded: false };

        const q = encodeURIComponent('sum(prometheus_engine_queries)');
        const queryRes = await hiveClient.fetchWithTokenCookie(`${base}/api/v1/query?query=${q}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!queryRes.ok) return { configured: true, reachable: true, overloaded: false };

        const n = await concurrentQueries(queryRes);
        return { configured: true, reachable: true, overloaded: n !== null && n >= overloadThreshold() };
    }
    catch
    {
        return { configured: true, reachable: false, overloaded: false };
    }
}

/**
 * Overlays Prometheus load on Hive's shared liveness result. Only an overloaded
 * Prometheus changes anything: an up Hive becomes degraded. Prometheus being
 * unreachable says nothing about Hive itself, so it leaves the state alone.
 */
export function applyHiveLoad(hive: ServiceHealth, load: HivePrometheusStatus): ServiceHealth
{
    if (hive.state !== 'up' || !load.configured || !load.reachable || !load.overloaded) return hive;
    return { ...hive, state: 'degraded', reason: 'overloaded' };
}
