'use client';

import WcIcon from '@mui/icons-material/Wc';
import { Box, Tooltip, Typography } from '@mui/material';

import type { ToiletQueue } from '@/api-shared/toilet-queue';

/** Tooltip text; null queue means the count couldn't be loaded. */
export function toiletQueueTooltip(queue: ToiletQueue | null, loading: boolean): string
{
    if (loading) return 'טוען תור לשירותים…';
    if (!queue) return 'לא ניתן לטעון את התור לשירותים';
    return `ממתינים לאישור יציאה לשירותים: ${queue.waiting} · בשירותים כעת: ${queue.out}`;
}

/** Students waiting for approval to go to the toilet (Hive `Toilet Request` status). */
export default function ToiletQueueIndicator({ queue, loading }: { queue: ToiletQueue | null; loading: boolean; })
{
    const text = loading ? '…' : queue ? String(queue.waiting) : '—';
    const waiting = (queue?.waiting ?? 0) > 0;

    return (
        <Tooltip title={ toiletQueueTooltip(queue, loading) } arrow placement="top">
            <Box
                data-testid="toilet-queue"
                aria-label={ toiletQueueTooltip(queue, loading) }
                sx={ {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    flexShrink: 0,
                    color: waiting ? 'info.main' : 'text.secondary',
                    bgcolor: (theme) => (waiting ? `rgba(${theme.vars!.palette.info.mainChannel} / 0.12)` : 'transparent'),
                } }
            >
                <WcIcon sx={ { fontSize: 18 } } />
                <Typography component="span" variant="body2" fontWeight={ 700 } sx={ { minWidth: '1ch', textAlign: 'center' } }>
                    { text }
                </Typography>
            </Box>
        </Tooltip>
    );
}
