import { type HealthBodyInterpreter, livenessInterpreter } from '@/api-server/service-health/probe';
import type { HealthServiceId, ServiceHealth } from '@/api-shared/service-health';

export interface MonitoredServiceDefinition
{
    id: HealthServiceId;
    /** Env vars holding the service's base URL, first set wins; none set → `unconfigured`. */
    baseUrlEnv: readonly string[];
    healthPath: string;
    interpret: HealthBodyInterpreter;
}

type BluzDependencyState = 'up' | 'degraded' | 'down';

function isBluzReport(body: unknown): body is { status: string; checks?: Record<string, BluzDependencyState>; }
{
    return typeof body === 'object' && body !== null && typeof (body as { status?: unknown; }).status === 'string';
}

/**
 * Bluz's /api/health reports `healthy | degraded | unhealthy` with per-dependency
 * checks (mongodb, postgres, hive), answering 503 when unhealthy.
 */
export const bluzInterpreter: HealthBodyInterpreter = (httpStatus, body) =>
{
    if (!isBluzReport(body)) return livenessInterpreter(httpStatus, body);

    const checks: ServiceHealth[ 'checks' ] = body.checks;
    switch (body.status)
    {
        case 'healthy': return { state: 'up', checks };
        case 'degraded': return { state: 'degraded', checks };
        default: return { state: 'down', checks };
    }
};

/**
 * Hive has no public health endpoint. The probe is unauthenticated, because its
 * result is cached and shared by every viewer, so Django answering at all (even
 * 401/403) means Hive is up. Only a 5xx or no answer is down. Prometheus load
 * is a per-viewer, token-authenticated overlay (see hive-load.ts).
 */
export const hiveInterpreter: HealthBodyInterpreter = (httpStatus) => ({
    state: httpStatus > 0 && httpStatus < 500 ? 'up' : 'down',
});

export const MONITORED_SERVICES: readonly MonitoredServiceDefinition[] = [
    { id: 'hive', baseUrlEnv: [ 'HIVE_URL', 'NEXT_PUBLIC_HIVE_URL' ], healthPath: '/api/core/time/', interpret: hiveInterpreter },
    { id: 'bluz', baseUrlEnv: [ 'BLUZ_URL' ], healthPath: '/api/health', interpret: bluzInterpreter },
    // Peek-a-Boo's endpoint is pure liveness by design (it never touches Hive).
    { id: 'peekaboo', baseUrlEnv: [ 'PEEKABOO_URL' ], healthPath: '/api/health', interpret: livenessInterpreter },
];

export function healthUrlFor(def: MonitoredServiceDefinition): string | null
{
    const base = def.baseUrlEnv.map((name) => process.env[ name ]?.trim()).find(Boolean);
    if (!base) return null;
    return `${base.replace(/\/$/, '')}${def.healthPath}`;
}
