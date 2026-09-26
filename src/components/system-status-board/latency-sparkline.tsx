'use client';

import { Box, useTheme } from '@mui/material';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';

import type { LatencySample } from '@/api-shared/service-health';
import { formatLatency, type TileState } from '@/components/system-status-board/shared-ui';

const SPARKLINE_W = 88;
const SPARKLINE_H = 30;

const PROBE_TIME_FORMAT = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Palette key for the line: it follows the tile's state so the graph and glyph agree. */
export function sparklinePaletteKey(state: TileState): 'error' | 'warning' | 'success'
{
    switch (state)
    {
        case 'down': return 'error';
        case 'degraded': return 'warning';
        default: return 'success';
    }
}

/** Chart series from probe history; unreachable probes stay null so the line breaks there. */
export function sparklineSeries(history: LatencySample[]): { data: (number | null)[]; times: number[]; }
{
    return { data: history.map((s) => s.latencyMs), times: history.map((s) => s.at) };
}

export const formatProbeTime = (at: number) => PROBE_TIME_FORMAT.format(at);

/**
 * Latency over time for one service. Unreachable probes (`latencyMs: null`) break
 * the line, so outages read as gaps rather than as a dip to zero.
 */
export default function LatencySparkline({ history, state }: { history: LatencySample[]; state: TileState; })
{
    const theme = useTheme();
    if (history.length < 2) return null;
    const { data, times } = sparklineSeries(history);

    return (
        <Box sx={ { width: SPARKLINE_W, height: SPARKLINE_H, flexShrink: 0, direction: 'ltr' } } data-testid="latency-sparkline">
            <SparkLineChart
                // Nulls are gaps at runtime; the prop is typed number[] only.
                data={ data as number[] }
                xAxis={ { data: times, valueFormatter: formatProbeTime } }
                yAxis={ { min: 0 } }
                width={ SPARKLINE_W }
                height={ SPARKLINE_H }
                color={ theme.palette[ sparklinePaletteKey(state) ].main }
                curve="linear"
                area
                showTooltip
                showHighlight
                valueFormatter={ (v) => (v === null ? 'לא זמין' : formatLatency(v)) }
            />
        </Box>
    );
}
