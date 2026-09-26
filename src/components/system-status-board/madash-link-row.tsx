'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { RingBuffer } from '@/api-shared/ring-buffer';
import type { LatencySample } from '@/api-shared/service-health';
import { useAuth } from '@/components/auth-provider';
import { MessageHandlerType } from '@/components/session-ws';
import LatencySparkline from '@/components/system-status-board/latency-sparkline';
import { ServiceHealthTile, ServiceIcon, type TileState } from '@/components/system-status-board/shared-ui';
import { MessageTypes } from '@/settings';

const PING_INTERVAL_MS = 1000;
const DEGRADED_SILENCE_MS = 2000;
const DOWN_SILENCE_MS = 5000;
/** Round-trip at/above which the live link counts as slow even while pongs keep arriving. */
const DEGRADED_RTT_MS = 1000;
/** One sample per 5 pings → the graph spans the last ~5 minutes. */
const HISTORY_EVERY_N_TICKS = 5;
const HISTORY_CAPACITY = 60;

export function madashLinkState(silenceMs: number, rttMs: number | null): TileState
{
    if (silenceMs > DOWN_SILENCE_MS) return 'down';
    if (silenceMs > DEGRADED_SILENCE_MS || (rttMs !== null && rttMs >= DEGRADED_RTT_MS)) return 'degraded';
    return 'up';
}

const MADASH_DETAIL: Record<TileState, string> = {
    loading: 'מתחבר…',
    unconfigured: 'מתחבר…',
    up: 'מחובר, זמן תגובה תקין',
    degraded: 'זמן תגובה ארוך מהרגיל',
    down: 'אין תגובה מהשרת',
};

export default function MadashLinkRow()
{
    const [ state, setState ] = useState<TileState>('up');
    const [ rttMs, setRttMs ] = useState<number | null>(null);
    const lastPongAt = useRef(0);
    const lastPingAt = useRef<number | null>(null);
    const lastRtt = useRef<number | null>(null);
    const historyBuffer = useRef(new RingBuffer<LatencySample>(HISTORY_CAPACITY));
    const tickCount = useRef(0);
    const [ history, setHistory ] = useState<LatencySample[]>([]);
    const { addMessageHandler, sendMessage, ws } = useAuth();

    const onPong = useCallback<MessageHandlerType>((messageType) =>
    {
        if (messageType !== MessageTypes.PONG) return;
        const now = Date.now();
        lastPongAt.current = now;
        if (lastPingAt.current !== null)
        {
            lastRtt.current = now - lastPingAt.current;
            setRttMs(lastRtt.current);
            lastPingAt.current = null;
        }
    }, []);

    useEffect(() =>
    {
        const unsub = addMessageHandler(onPong);
        lastPongAt.current = Date.now();
        const tick = () =>
        {
            // The socket is null while connecting/reconnecting; sending then only logs an error.
            if (ws.current?.readyState === WebSocket.OPEN)
            {
                // Keep the oldest outstanding ping so a stalled link reports its true delay.
                lastPingAt.current ??= Date.now();
                sendMessage({ type: MessageTypes.PING });
            }
            const next = madashLinkState(Date.now() - lastPongAt.current, lastRtt.current);
            setState(next);
            if (tickCount.current++ % HISTORY_EVERY_N_TICKS === 0)
            {
                historyBuffer.current.push({ at: Date.now(), latencyMs: next === 'down' ? null : lastRtt.current });
                setHistory(historyBuffer.current.toArray());
            }
        };
        tick();
        const interval = setInterval(tick, PING_INTERVAL_MS);
        return () =>
        {
            clearInterval(interval);
            unsub();
        };
    }, [ onPong, addMessageHandler, sendMessage, ws ]);

    return (
        <ServiceHealthTile
            testId="service-tile-madash"
            label="מדש"
            icon={ <ServiceIcon src="/Madash.svg" /> }
            state={ state }
            detail={ MADASH_DETAIL[ state ] }
            latencyMs={ rttMs }
            mid={ <LatencySparkline history={ history } state={ state } /> }
        />
    );
}
