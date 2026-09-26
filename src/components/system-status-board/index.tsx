'use client';

import DnsIcon from '@mui/icons-material/Dns';
import { Box } from '@mui/material';

import CollapsableCard from '@/components/collapsable-card';
import HiveHealthRow from '@/components/system-status-board/hive-health-row';
import MadashLinkRow from '@/components/system-status-board/madash-link-row';
import MonitoredServiceRows from '@/components/system-status-board/monitored-service-rows';

const SERVICE_STACK_GAP = 0.625;

function SystemStatusBoardContent()
{
    return (
        <Box
            sx={ {
                display: 'flex',
                flexWrap: 'wrap',
                gap: SERVICE_STACK_GAP,
                width: '100%',
                // This targets the child tiles: grow to fill space, but 
                // wrap to the next line if the container is smaller than 280px.
                '& > *': {
                    flex: '1 1 280px',
                    minWidth: 0,
                }
            } }
        >
            <MadashLinkRow />
            <HiveHealthRow />
            <MonitoredServiceRows />
        </Box>
    );
}

export default function SystemStatusBoard()
{
    return (
        <CollapsableCard
            name="מצב העולם"
            icon={ DnsIcon }
            mainColor="secondary"
            content={ <SystemStatusBoardContent /> }
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
