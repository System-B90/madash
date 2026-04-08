'use client';

import { alpha, Box } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import CollapsableCard from '@/components/collapsable-card';

import MadashLinkRow from './madash-link-row';
import HiveHealthRow from './hive-health-row';

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
                    `linear-gradient(165deg, ${alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.07 : 0.05)} 0%, ${theme.palette.background.default} 42%, ${theme.palette.background.default} 100%)`,
            } }
        />
    );
}
