'use client';

import { Box, type Theme, useTheme } from '@mui/material';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';

import type { LatencySample } from '@/api-shared/service-health';
import { formatLatency, type TileState } from '@/components/system-status-board/shared-ui';

const SPARKLINE_W = 88;
const SPARKLINE_H = 30;

const PROBE_TIME_FORMAT = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function strokeFor(state: TileState, theme: Theme): string
{
    switch (state)
    {
        case 'down': return theme.palette.error.main;
        case 'degraded': return theme.palette.warning.main;
        default: return theme.palette.success.main;
    }
}

/**
 * Latency over time for one service. Unreachable probes (`latencyMs: null`) break
 * the line, so outages read as gaps rather than as a dip to zero.
 */
export default function LatencySparkline({ history, state }: { history: LatencySample[]; state: TileState; })
{
    const theme = useTheme();
    if (history.length < 2) return null;

    return (
        <Box sx={ { width: SPARKLINE_W, height: SPARKLINE_H, flexShrink: 0, direction: 'ltr' } } data-testid="latency-sparkline">
            <SparkLineChart
                // Nulls are gaps at runtime; the prop is typed number[] only.
                data={ history.map((s) => s.latencyMs) as number[] }
                xAxis={ { data: history.map((s) => s.at), valueFormatter: (at: number) => PROBE_TIME_FORMAT.format(at) } }
                yAxis={ { min: 0 } }
                width={ SPARKLINE_W }
                height={ SPARKLINE_H }
                color={ strokeFor(state, theme) }
                curve="linear"
                area
                showTooltip
                showHighlight
                valueFormatter={ (v) => (v === null ? 'לא זמין' : formatLatency(v)) }
            />
        </Box>
    );
}
