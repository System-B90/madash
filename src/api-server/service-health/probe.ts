import type { ServiceHealth, ServiceHealthState } from '@/api-shared/service-health';

/** What a service's health body tells us beyond "it answered". */
export interface HealthBodyVerdict
{
    state: Exclude<ServiceHealthState, 'unconfigured'>;
    checks?: ServiceHealth[ 'checks' ];
}

/**
 * Turns a service's raw health response into a verdict. Each service owns its own
 * body format, so each registers its own interpreter (Open/Closed: new formats add
 * an interpreter, the prober never changes).
 */
export type HealthBodyInterpreter = (httpStatus: number, body: unknown) => HealthBodyVerdict;

export interface ProbeResult
{
    reached: boolean;
    latencyMs: number;
    verdict: HealthBodyVerdict;
}

export const DEFAULT_PROBE_TIMEOUT_MS = 5000;

/** Plain liveness endpoint: any 2xx is up. */
export const livenessInterpreter: HealthBodyInterpreter = (httpStatus) => ({
    state: httpStatus >= 200 && httpStatus < 300 ? 'up' : 'down',
});

async function readJson(res: Response): Promise<unknown>
{
    try
    {
        return await res.json();
    }
    catch
    {
        return null;
    }
}

/**
 * One timed GET against a health URL. Never throws: a hung or failing service is a
 * result, not an error, and must not break the board for the other services.
 */
export async function probeHealthUrl(
    url: string,
    interpret: HealthBodyInterpreter,
    timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
): Promise<ProbeResult>
{
    const started = performance.now();
    try
    {
        const res = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(timeoutMs),
        });
        const body = await readJson(res);
        const latencyMs = Math.round(performance.now() - started);
        return { reached: true, latencyMs, verdict: interpret(res.status, body) };
    }
    catch
    {
        return { reached: false, latencyMs: Math.round(performance.now() - started), verdict: { state: 'down' } };
    }
}
