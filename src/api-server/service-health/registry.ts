import { type HealthBodyInterpreter, livenessInterpreter } from '@/api-server/service-health/probe';
import type { MonitoredServiceId, ServiceHealth } from '@/api-shared/service-health';

export interface MonitoredServiceDefinition
{
    id: MonitoredServiceId;
    /** Env var holding the service's public base URL; unset → `unconfigured`. */
    baseUrlEnv: string;
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

export const MONITORED_SERVICES: readonly MonitoredServiceDefinition[] = [
    { id: 'bluz', baseUrlEnv: 'BLUZ_URL', healthPath: '/api/health', interpret: bluzInterpreter },
    // Peek-a-Boo's endpoint is pure liveness by design (it never touches Hive).
    { id: 'peekaboo', baseUrlEnv: 'PEEKABOO_URL', healthPath: '/api/health', interpret: livenessInterpreter },
];

export function healthUrlFor(def: MonitoredServiceDefinition): string | null
{
    const base = process.env[ def.baseUrlEnv ]?.trim();
    if (!base) return null;
    return `${base.replace(/\/$/, '')}${def.healthPath}`;
}
