import {
    MONITORED_SERVICE_IDS,
    type ServiceHealth,
    type ServicesHealthResponse,
} from '@/api-shared/service-health';
import { DEFAULT_STATE_DETAIL } from '@/components/system-status-board/shared-ui';

const DEPENDENCY_LABELS: Record<string, string> = {
    hive: 'הייב',
    mongodb: 'MongoDB',
    postgres: 'Postgres',
};

const DEPENDENCY_STATE_LABELS: Record<string, string> = { up: 'תקין', degraded: 'חלקי', down: 'לא זמין' };

const dependencyLabel = (name: string) => DEPENDENCY_LABELS[ name ] ?? name;

/** Tile detail line: says *why* a service isn't up when we know. */
export function describeServiceHealth(health: ServiceHealth): string
{
    const failing = Object.entries(health.checks ?? {})
        .filter(([ , s ]) => s !== 'up')
        .map(([ name ]) => dependencyLabel(name));

    switch (health.reason)
    {
        case 'slow': return 'זמן תגובה ארוך מהרגיל';
        case 'dependency':
            return failing.length ? `תקלה ב־${failing.join(', ')}` : DEFAULT_STATE_DETAIL[ health.state ];
        default: return DEFAULT_STATE_DETAIL[ health.state ];
    }
}

/** Glyph tooltip listing each dependency the service reports; undefined when it reports none. */
export function dependencyChecksTooltip(health: ServiceHealth): string | undefined
{
    if (!health.checks) return undefined;
    return Object.entries(health.checks)
        .map(([ name, s ]) => `${dependencyLabel(name)}: ${DEPENDENCY_STATE_LABELS[ s ] ?? s}`)
        .join(' · ');
}

/** The route itself failing (madash backend unreachable) → every service is unknown-down. */
export function allServicesUnreachable(now = Date.now()): ServicesHealthResponse
{
    return MONITORED_SERVICE_IDS.map((id) => ({ id, state: 'down', latencyMs: null, reason: 'unreachable', checkedAt: now, history: [] }));
}
