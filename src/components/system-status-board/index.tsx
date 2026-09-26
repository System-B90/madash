'use client';

import DnsIcon from '@mui/icons-material/Dns';
import { Box } from '@mui/material';

import { MONITORED_SERVICE_IDS } from '@/api-shared/service-health';
import type { ServicesHealthResponse } from '@/api-shared/service-health';
import CollapsableCard from '@/components/collapsable-card';
import CompactStatusStrip, { type CompactServiceStatus } from '@/components/system-status-board/compact-status-strip';
import HiveHealthRow, { HIVE_LABEL, type HiveHealth, HiveServiceIcon, useHiveHealth } from '@/components/system-status-board/hive-health-row';
import MadashLinkRow, { MADASH_LABEL, type MadashLinkHealth, MadashServiceIcon, useMadashLink } from '@/components/system-status-board/madash-link-row';
import MonitoredServiceRows, {
    MonitoredServiceIcon,
    SERVICE_LABELS,
    useMonitoredServices,
} from '@/components/system-status-board/monitored-service-rows';

const SERVICE_STACK_GAP = 0.625;
/** Narrowest a tile gets while still fitting label, detail, widget and glyph side by side. */
const TILE_MIN_PX = 320;
const TWO_COLUMNS_MIN_PX = TILE_MIN_PX * 2;
const FOUR_COLUMNS_MIN_PX = TILE_MIN_PX * 4;

export interface BoardData
{
    link: MadashLinkHealth;
    hive: HiveHealth;
    services: ServicesHealthResponse | null;
}

export function compactStatuses({ link, hive, services }: BoardData): CompactServiceStatus[]
{
    return [
        { id: 'madash', label: MADASH_LABEL, icon: <MadashServiceIcon />, state: link.state },
        { id: 'hive', label: HIVE_LABEL, icon: <HiveServiceIcon />, state: hive.state },
        ...MONITORED_SERVICE_IDS.map((id) => ({
            id,
            label: SERVICE_LABELS[ id ],
            icon: <MonitoredServiceIcon id={ id } />,
            state: services?.find((s) => s.id === id)?.state ?? 'loading' as const,
        })),
    ];
}

function SystemStatusBoardContent({ link, hive, services }: BoardData)
{
    return (
        <Box sx={ { containerType: 'inline-size', width: '100%' } }>
            <Box
                data-testid="service-tiles"
                sx={ {
                    display: 'grid',
                    gap: SERVICE_STACK_GAP,
                    // 1 → 2 → 4 columns by the board's own width (never 3+1),
                    // so every tile keeps room for its text, widget and glyph on one line.
                    gridTemplateColumns: '1fr',
                    [ `@container (min-width: ${TWO_COLUMNS_MIN_PX}px)` ]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
                    [ `@container (min-width: ${FOUR_COLUMNS_MIN_PX}px)` ]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
                } }
            >
                <MadashLinkRow link={ link } />
                <HiveHealthRow hive={ hive } />
                <MonitoredServiceRows services={ services } />
            </Box>
        </Box>
    );
}

export default function SystemStatusBoard()
{
    // Polled here, not in the rows: the card unmounts its content when collapsed,
    // and the collapsed summary still needs live states.
    const data: BoardData = { link: useMadashLink(), hive: useHiveHealth(), services: useMonitoredServices() };

    return (
        <CollapsableCard
            name="מצב העולם"
            icon={ DnsIcon }
            mainColor="secondary"
            content={ <SystemStatusBoardContent { ...data } /> }
            collapsedSummary={ <CompactStatusStrip services={ compactStatuses(data) } /> }
            contentSx={ {
                p: 1,
                pt: 1,
                minHeight: 0,
                background: (theme) =>
                    `linear-gradient(165deg, rgba(${theme.vars!.palette.secondary.mainChannel} / 0.05) 0%, ${theme.vars!.palette.background.default} 42%, ${theme.vars!.palette.background.default} 100%)`,
            } }
        />
    );
}
