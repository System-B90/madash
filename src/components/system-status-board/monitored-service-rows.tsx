'use client';

import { apiGetServicesHealth } from '@/api-client/service-health';
import { MONITORED_SERVICE_IDS, type MonitoredServiceId, type ServicesHealthResponse } from '@/api-shared/service-health';
import LatencySparkline from '@/components/system-status-board/latency-sparkline';
import {
    allServicesUnreachable,
    dependencyChecksTooltip,
    describeServiceHealth,
} from '@/components/system-status-board/service-health-text';
import { ServiceHealthTile, ServiceIcon } from '@/components/system-status-board/shared-ui';
import { usePolling } from '@/components/system-status-board/use-polling';

const SERVICES_POLL_MS = 15_000;

export const SERVICE_LABELS: Record<MonitoredServiceId, string> = {
    bluz: 'בלוז',
    peekaboo: 'Peek-a-Boo',
};

const SERVICE_ICONS: Record<MonitoredServiceId, string> = {
    bluz: '/services/bluz.svg',
    peekaboo: '/services/peekaboo.svg',
};

export const MonitoredServiceIcon = ({ id }: { id: MonitoredServiceId; }) => <ServiceIcon src={ SERVICE_ICONS[ id ] } />;

/** Polls the unified backend; `null` until the first response. */
export function useMonitoredServices(): ServicesHealthResponse | null
{
    return usePolling(apiGetServicesHealth, SERVICES_POLL_MS, () => allServicesUnreachable());
}

export default function MonitoredServiceRows({ services }: { services: ServicesHealthResponse | null; })
{
    return MONITORED_SERVICE_IDS.map((id) =>
    {
        const health = services?.find((s) => s.id === id);
        const common = {
            testId: `service-tile-${id}`,
            label: SERVICE_LABELS[ id ],
            icon: <MonitoredServiceIcon id={ id } />,
        };
        return health
            ? (
                <ServiceHealthTile
                    key={ id }
                    { ...common }
                    state={ health.state }
                    detail={ describeServiceHealth(health) }
                    latencyMs={ health.latencyMs }
                    glyphTitle={ dependencyChecksTooltip(health) }
                    mid={ <LatencySparkline history={ health.history } state={ health.state } /> }
                />
            )
            : <ServiceHealthTile key={ id } { ...common } state="loading" />;
    });
}
