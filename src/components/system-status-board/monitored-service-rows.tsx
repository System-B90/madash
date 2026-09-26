'use client';

import { apiGetServicesHealth } from '@/api-client/service-health';
import {
    MONITORED_SERVICE_IDS,
    type MonitoredServiceId,
    type ServiceHealth,
    type ServicesHealthResponse,
} from '@/api-shared/service-health';
import LatencySparkline from '@/components/system-status-board/latency-sparkline';
import { DEFAULT_STATE_DETAIL, ServiceHealthTile, ServiceIcon } from '@/components/system-status-board/shared-ui';
import { usePolling } from '@/components/system-status-board/use-polling';

const SERVICES_POLL_MS = 15_000;

const SERVICE_LABELS: Record<MonitoredServiceId, string> = {
    bluz: 'בלוז',
    peekaboo: 'Peek-a-Boo',
};

const SERVICE_ICONS: Record<MonitoredServiceId, string> = {
    bluz: '/services/bluz.svg',
    peekaboo: '/services/peekaboo.svg',
};

const DEPENDENCY_LABELS: Record<string, string> = {
    hive: 'הייב',
    mongodb: 'MongoDB',
    postgres: 'Postgres',
};

const DEPENDENCY_STATE_LABELS = { up: 'תקין', degraded: 'חלקי', down: 'לא זמין' } as const;

function describe(health: ServiceHealth): string
{
    const failing = Object.entries(health.checks ?? {})
        .filter(([ , s ]) => s !== 'up')
        .map(([ name ]) => DEPENDENCY_LABELS[ name ] ?? name);

    switch (health.reason)
    {
        case 'slow': return 'זמן תגובה ארוך מהרגיל';
        case 'dependency':
            return failing.length ? `תקלה ב־${failing.join(', ')}` : DEFAULT_STATE_DETAIL[ health.state ];
        default: return DEFAULT_STATE_DETAIL[ health.state ];
    }
}

function checksTooltip(health: ServiceHealth): string | undefined
{
    if (!health.checks) return undefined;
    return Object.entries(health.checks)
        .map(([ name, s ]) => `${DEPENDENCY_LABELS[ name ] ?? name}: ${DEPENDENCY_STATE_LABELS[ s ] ?? s}`)
        .join(' · ');
}

/** The route itself failing (madash backend unreachable) → every service is unknown-down. */
function allDown(): ServicesHealthResponse
{
    const checkedAt = Date.now();
    return MONITORED_SERVICE_IDS.map((id) => ({ id, state: 'down', latencyMs: null, reason: 'unreachable', checkedAt, history: [] }));
}

export default function MonitoredServiceRows()
{
    const services = usePolling(apiGetServicesHealth, SERVICES_POLL_MS, allDown);

    return MONITORED_SERVICE_IDS.map((id) =>
    {
        const health = services?.find((s) => s.id === id);
        const common = {
            testId: `service-tile-${id}`,
            label: SERVICE_LABELS[ id ],
            icon: <ServiceIcon src={ SERVICE_ICONS[ id ] } />,
        };
        return health
            ? (
                <ServiceHealthTile
                    key={ id }
                    { ...common }
                    state={ health.state }
                    detail={ describe(health) }
                    latencyMs={ health.latencyMs }
                    glyphTitle={ checksTooltip(health) }
                    mid={ <LatencySparkline history={ health.history } state={ health.state } /> }
                />
            )
            : <ServiceHealthTile key={ id } { ...common } state="loading" />;
    });
}
