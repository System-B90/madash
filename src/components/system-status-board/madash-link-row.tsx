'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import SpeedIcon from '@mui/icons-material/Speed';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { MessageHandlerType } from '@/components/session-ws';
import { ServiceStatusTile, StatusGlyph } from '@/components/system-status-board/shared-ui';
import { MessageTypes } from '@/settings';

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
    const { addMessageHandler, sendMessage, ws } = useAuth();

    const onPong = useCallback<MessageHandlerType>((messageType) =>
    {
        if (messageType !== MessageTypes.PONG) return;
        lastPongAt.current = Date.now();
        setHealth('ok');
    }, []);

    useEffect(() =>
    {
        const unsub = addMessageHandler(onPong);
        lastPongAt.current = Date.now();
        const tick = () =>
        {
            // The socket is null while connecting/reconnecting; sending then only logs an error.
            if (ws.current?.readyState === WebSocket.OPEN) sendMessage({ type: MessageTypes.PING });

            const silence = Date.now() - lastPongAt.current;
            if (silence > 5000) setHealth('error');
            else if (silence > 2000) setHealth('degraded');
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () =>
        {
            clearInterval(interval);
            unsub();
        };
    }, [ onPong, addMessageHandler, sendMessage, ws ]);

    return (
        <ServiceStatusTile
            label="מדש"
            detail={ madashDetail(health) }
            glyph={ <MadashLinkGlyph health={ health } /> }
        />
    );
}
