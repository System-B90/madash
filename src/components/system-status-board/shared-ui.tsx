'use client';

import { alpha, Box, IconProps, Tooltip, Typography, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { ElementType, type ReactNode } from 'react';

export function toneFromIconColor(color: IconProps[ 'color' ], theme: Theme)
{
    switch (color)
    {
        case 'success': return theme.palette.success.main;
        case 'warning': return theme.palette.warning.main;
        case 'error': return theme.palette.error.main;
        default: return theme.palette.text.secondary;
    }
}

export function StatusGlyph({
    icon: Icon,
    title,
    color,
    pulse,
}: {
    icon: ElementType;
    title: string;
    color: IconProps[ 'color' ];
    pulse?: boolean;
})
{
    const theme = useTheme();
    const tone = toneFromIconColor(color, theme);

    return (
        <Tooltip title={ title } arrow placement="top">
            <Box
                sx={ {
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: alpha(tone, 0.12),
                    border: `1px solid ${alpha(tone, 0.28)}`,
                    boxShadow: `0 0 0 1px ${alpha(tone, 0.06)} inset`,
                    ...(pulse && {
                        animation: 'status-board-pulse 1.5s ease-in-out infinite',
                        '@keyframes status-board-pulse': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.45 },
                        },
                    }),
                } }
            >
                <Icon color={ color } sx={ { fontSize: 18 } } />
            </Box>
        </Tooltip>
    );
}

export function ServiceStatusTile({
    label,
    detail,
    mid,
    glyph,
    rootSx,
}: {
    label: string;
    detail: string;
    mid?: ReactNode;
    glyph: ReactNode;
    rootSx?: SxProps<Theme>;
})
{
    return (
        <Box
            sx={ {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap', // Allows internal contents to wrap
                gap: 1.25,
                px: 1.5,
                py: 1, // Slight padding increase to handle vertical stacking gracefully
                minHeight: 36,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.04),
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.35),
                    boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.06)}`,
                },
                ...rootSx,
            } }
        >
            {/* Left Side: Text Container */ }
            <Box
                sx={ {
                    flex: '1 1 160px',
                    minWidth: '160px', // HARD STOP: Forces wrap if the container gets too small
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    flexWrap: 'wrap',
                    lineHeight: 1.35,
                } }
            >
                <Typography component="span" variant="body2" fontWeight={ 700 } color="text.primary" sx={ { letterSpacing: '-0.02em' } }>
                    { label }
                </Typography>
                <Typography component="span" variant="caption" color="text.disabled" sx={ { lineHeight: 1, userSelect: 'none', flexShrink: 0 } } aria-hidden>
                    ·
                </Typography>
                <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={ {
                        flex: 1,
                        minWidth: 0,
                        fontWeight: 400,
                        fontSize: '0.8125rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    } }
                >
                    { detail }
                </Typography>
            </Box>

            {/* Right Side: Gauge & Icon */ }
            <Box
                sx={ {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    flexShrink: 0,
                    marginLeft: 'auto' // Ensures it stays right-aligned if it drops to a new line
                } }
            >
                { mid }
                { glyph }
            </Box>
        </Box>
    );
}
