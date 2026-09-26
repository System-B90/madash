'use client';

import { apiGetServicesHealth } from '@/api-client/service-health';
import { MONITORED_SERVICE_IDS, type MonitoredServiceId } from '@/api-shared/service-health';
import LatencySparkline from '@/components/system-status-board/latency-sparkline';
import {
    allServicesUnreachable,
    dependencyChecksTooltip,
    describeServiceHealth,
} from '@/components/system-status-board/service-health-text';
import { ServiceHealthTile, ServiceIcon } from '@/components/system-status-board/shared-ui';
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

export default function MonitoredServiceRows()
{
    const services = usePolling(apiGetServicesHealth, SERVICES_POLL_MS, () => allServicesUnreachable());

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
                    detail={ describeServiceHealth(health) }
                    latencyMs={ health.latencyMs }
                    glyphTitle={ dependencyChecksTooltip(health) }
                    mid={ <LatencySparkline history={ health.history } state={ health.state } /> }
                />
            )
            : <ServiceHealthTile key={ id } { ...common } state="loading" />;
    });
}
