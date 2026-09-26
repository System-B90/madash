'use client';

import { Box, Tooltip, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

import { DEFAULT_STATE_DETAIL, type TileState } from '@/components/system-status-board/shared-ui';

export interface CompactServiceStatus
{
    id: string;
    label: string;
    icon: ReactNode;
    state: TileState;
}

const DOT = 8;

/** Palette key for the status dot; neutral while unknown. */
export function compactDotPalette(state: TileState): 'success' | 'warning' | 'error' | null
{
    switch (state)
    {
        case 'up': return 'success';
        case 'degraded': return 'warning';
        case 'down': return 'error';
        default: return null;
    }
}

/**
 * One-line summary for the collapsed board: each service's logo with a status dot.
 * Clicks pass through to the card header (it toggles), so no own handlers here.
 */
export default function CompactStatusStrip({ services }: { services: CompactServiceStatus[]; })
{
    const theme = useTheme();
    return (
        <Box sx={ { display: 'flex', alignItems: 'center', gap: 1.5 } } data-testid="status-strip">
            { services.map((s) =>
            {
                const palette = compactDotPalette(s.state);
                return (
                    <Tooltip key={ s.id } title={ `${s.label} · ${DEFAULT_STATE_DETAIL[ s.state ]}` } arrow placement="bottom">
                        <Box
                            data-testid={ `status-strip-${s.id}` }
                            data-state={ s.state }
                            aria-label={ `${s.label}: ${DEFAULT_STATE_DETAIL[ s.state ]}` }
                            sx={ { position: 'relative', display: 'flex' } }
                        >
                            { s.icon }
                            <Box
                                sx={ {
                                    position: 'absolute',
                                    insetInlineEnd: -3,
                                    bottom: -3,
                                    width: DOT,
                                    height: DOT,
                                    borderRadius: '50%',
                                    bgcolor: palette ? theme.palette[ palette ].main : 'text.disabled',
                                    border: '1.5px solid',
                                    borderColor: 'background.paper',
                                    ...(s.state === 'loading' && { opacity: 0.5 }),
                                } }
                            />
                        </Box>
                    </Tooltip>
                );
            }) }
        </Box>
    );
}
