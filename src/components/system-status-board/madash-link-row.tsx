'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import SpeedIcon from '@mui/icons-material/Speed';

import { useAuth } from '@/components/auth-provider';
import { MessageHandlerType } from '@/components/session-ws';
import { MessageTypes } from '@/session-common';
import { ServiceStatusTile, StatusGlyph } from './shared-ui';

type LinkHealth = 'ok' | 'degraded' | 'error';

function madashDetail(health: LinkHealth): string
{
    switch (health)
    {
        case 'ok': return 'מחובר, זמן תגובה תקין';
        case 'degraded': return 'זמן תגובה ארוך מהרגיל';
        case 'error': return 'אין תגובה מהשרת';
    }
}

function MadashLinkGlyph({ health }: { health: LinkHealth; })
{
    switch (health)
    {
        case 'ok': return <StatusGlyph icon={ CheckCircleIcon } title="הכל טוב" color="success" />;
        case 'degraded': return <StatusGlyph icon={ SpeedIcon } title="איטי מהרגיל" color="warning" />;
        case 'error': return <StatusGlyph icon={ SignalWifiStatusbarConnectedNoInternet4Icon } title="לא מגיב" color="error" />;
    }
}

export default function MadashLinkRow()
{
    const [ health, setHealth ] = useState<LinkHealth>('ok');
    const lastPongAt = useRef(0);
    const pingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { addMessageHandler, sendMessage } = useAuth();

    const onPong = useCallback<MessageHandlerType>((messageType) =>
    {
        if (messageType !== MessageTypes.PONG) return;

        const now = Date.now();
        const prev = lastPongAt.current;
        lastPongAt.current = now;

        if (prev === 0)
        {
            setHealth('ok');
        } else
        {
            const latency = now - prev;
            if (latency > 5000) setHealth('error');
            else if (latency > 2000) setHealth('degraded');
            else setHealth('ok');
        }

        if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
        pingTimeoutRef.current = setTimeout(() =>
        {
            sendMessage({ type: MessageTypes.PING });
        }, 1000);
    }, [ sendMessage ]);

    useEffect(() =>
    {
        sendMessage({ type: MessageTypes.PING });
        const unsub = addMessageHandler(onPong);
        return () =>
        {
            if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
            unsub();
        };
    }, [ onPong, addMessageHandler, sendMessage ]);

    return (
        <ServiceStatusTile
            label="מדש"
            detail={ madashDetail(health) }
            glyph={ <MadashLinkGlyph health={ health } /> }
        />
    );
}
