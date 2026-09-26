'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import SpeedIcon from '@mui/icons-material/Speed';
import { alpha, Box, IconProps, Tooltip, Typography, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { ElementType, type ReactNode, useEffect, useState } from 'react';

import type { ServiceHealthState } from '@/api-shared/service-health';

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

/** Everything a tile can show: the shared service states plus the client-only "not checked yet". */
export type TileState = ServiceHealthState | 'loading';

const STATE_GLYPHS: Record<TileState, { icon: ElementType; color: IconProps[ 'color' ]; title: string; pulse?: boolean; }> = {
    loading: { icon: HourglassEmptyIcon, color: 'action', title: 'בודק…', pulse: true },
    unconfigured: { icon: HelpOutlineIcon, color: 'action', title: 'ניטור לא הוגדר בשרת' },
    up: { icon: CheckCircleIcon, color: 'success', title: 'זמין ותקין' },
    degraded: { icon: SpeedIcon, color: 'warning', title: 'ביצועים ירודים' },
    down: { icon: SignalWifiStatusbarConnectedNoInternet4Icon, color: 'error', title: 'לא זמין' },
};

/** Whole-tile tint for states that need attention, so an outage reads at a glance. */
function alertTileSx(palette: 'error' | 'warning', strength: number): SxProps<Theme>
{
    return {
        bgcolor: (theme: Theme) => `rgba(${theme.vars!.palette[ palette ].mainChannel} / ${0.1 * strength})`,
        borderColor: (theme: Theme) => `rgba(${theme.vars!.palette[ palette ].mainChannel} / ${0.45 * strength})`,
        '&:hover': {
            borderColor: (theme: Theme) => `rgba(${theme.vars!.palette[ palette ].mainChannel} / 0.7)`,
        },
    };
}

const STATE_TILE_SX: Partial<Record<TileState, SxProps<Theme>>> = {
    down: alertTileSx('error', 1.6),
    degraded: alertTileSx('warning', 1.2),
};

export const DEFAULT_STATE_DETAIL: Record<TileState, string> = {
    loading: 'בודק זמינות…',
    unconfigured: 'המערכת לא הוגדרה לניטור',
    up: 'שירות זמין ותקין',
    degraded: 'השירות איטי או פועל חלקית',
    down: 'שירות לא זמין או לא מגיב',
};

export function ServiceStateGlyph({ state, title }: { state: TileState; title?: string; })
{
    const g = STATE_GLYPHS[ state ];
    return <StatusGlyph icon={ g.icon } color={ g.color } title={ title ?? g.title } pulse={ g.pulse } />;
}

const SERVICE_ICON_SIZE = 22;

/**
 * A service's brand mark: its real logo (`src`), falling back to `icon` when the
 * image fails to load (e.g. a remote service that's down).
 *
 * The <img>'s own error can fire before hydration attaches onError, so a fresh
 * Image probe after mount catches that case too (same approach as Bluz's HiveLogo).
 */
export function ServiceIcon({ src, icon: Icon, imgSx }: { src?: string; icon?: ElementType; imgSx?: SxProps<Theme>; })
{
    const [ failed, setFailed ] = useState(false);

    useEffect(() =>
    {
        if (!src) return;
        let cancelled = false;
        const probe = new Image();
        probe.onerror = () => { if (!cancelled) setFailed(true); };
        probe.src = src;
        return () => { cancelled = true; };
    }, [ src ]);

    const showImage = src && !failed;
    return (
        <Box
            aria-hidden
            sx={ {
                width: SERVICE_ICON_SIZE,
                height: SERVICE_ICON_SIZE,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            } }
        >
            { showImage
                ? <Box component="img" src={ src } alt="" onError={ () => setFailed(true) } sx={ [ { width: '100%', height: '100%', objectFit: 'contain' }, ...(Array.isArray(imgSx) ? imgSx : [ imgSx ]) ] } />
                : Icon && <Icon sx={ { fontSize: SERVICE_ICON_SIZE, color: 'text.secondary' } } /> }
        </Box>
    );
}

export function formatLatency(latencyMs: number): string
{
    return latencyMs < 1000 ? `${latencyMs}ms` : `${(latencyMs / 1000).toFixed(1)}s`;
}

/**
 * The one tile every service row renders: label, state-driven glyph, detail text,
 * optional latency, and an optional service-specific widget (e.g. Hive's helps gauge).
 */
export function ServiceHealthTile({
    label,
    state,
    detail,
    latencyMs,
    glyphTitle,
    mid,
    testId,
    icon,
}: {
    label: string;
    icon?: ReactNode;
    state: TileState;
    detail?: string;
    latencyMs?: number | null;
    glyphTitle?: string;
    mid?: ReactNode;
    testId?: string;
})
{
    const text = detail ?? DEFAULT_STATE_DETAIL[ state ];
    const showLatency = latencyMs != null && (state === 'up' || state === 'degraded');
    return (
        <ServiceStatusTile
            label={ label }
            detail={ showLatency ? `${text} · ${formatLatency(latencyMs)}` : text }
            mid={ mid }
            glyph={ <ServiceStateGlyph state={ state } title={ glyphTitle } /> }
            testId={ testId }
            dataState={ state }
            rootSx={ STATE_TILE_SX[ state ] }
            icon={ icon }
        />
    );
}

export function ServiceStatusTile({
    label,
    detail,
    mid,
    glyph,
    rootSx,
    testId,
    dataState,
    icon,
}: {
    label: string;
    detail: string;
    icon?: ReactNode;
    mid?: ReactNode;
    glyph: ReactNode;
    rootSx?: SxProps<Theme>;
    testId?: string;
    dataState?: string;
})
{
    return (
        <Box
            data-testid={ testId }
            data-state={ dataState }
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
                bgcolor: (theme) => `rgba(${theme.vars!.palette.primary.mainChannel} / 0.05)`,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                    borderColor: (theme) => `rgba(${theme.vars!.palette.primary.mainChannel} / 0.35)`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
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
                { icon }
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
                    marginInlineStart: 'auto', // Keeps it at the inline end if it drops to a new line
                } }
            >
                { mid }
                { glyph }
            </Box>
        </Box>
    );
}
