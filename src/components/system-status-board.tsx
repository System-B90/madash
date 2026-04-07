import { ElementType, useCallback, useEffect, useRef, useState } from "react";
import { IconProps, Stack, Tooltip, Typography } from "@mui/material";
import DnsIcon from '@mui/icons-material/Dns';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import ReportIcon from '@mui/icons-material/Report';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import CollapsableCard from "@/components/collapsable-card";
import { useAuth } from "@/components/auth-provider";
import { MessageHandlerType } from "@/components/session-ws";
import { MessageTypes } from "@/session-common";

interface StatusIconWrapperProps extends Omit<IconProps, 'name'>
{
    icon: ElementType;
    name: string;
}

function StatusIconWrapper({ icon: Icon, name, ...props }: StatusIconWrapperProps)
{
    return (
        <Tooltip title={ name } arrow>
            <Icon { ...props } />
        </Tooltip>
    );
}

function DegradedSpeedIcon()
{
    return <StatusIconWrapper icon={ SpeedIcon } name="איטי מהרגיל" color="warning" />;
}

function NotResponsiveIcon()
{
    return <StatusIconWrapper icon={ SignalWifiStatusbarConnectedNoInternet4Icon } name="לא מגיב" color="error" />;
}

function OkIcon()
{
    return <StatusIconWrapper icon={ CheckCircleIcon } name="הכל טוב" color="success" />;
}

function UnknownErrorIcon()
{
    return <StatusIconWrapper icon={ ReportIcon } name="יש שגיאה" color="error" />;
}

function SelfTestStatusBoard()
{
    const [ connectionStatus, setConnectionStatus ] = useState<'ok' | 'degraded' | 'error'>('ok');
    const lastServerMessageTime = useRef<number>(Date.now());
    const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { addMessageHandler, sendMessage } = useAuth();

    const messageHandler = useCallback<MessageHandlerType>((messageType) =>
    {
        if (messageType !== MessageTypes.PONG) return;

        const now = Date.now();
        const latency = now - lastServerMessageTime.current;
        lastServerMessageTime.current = now;

        if (latency > 5000)
        {
            setConnectionStatus('error');
        } else if (latency > 2000)
        {
            setConnectionStatus('degraded');
        } else
        {
            setConnectionStatus('ok');
        }

        if (pingTimeoutRef.current)
        {
            clearTimeout(pingTimeoutRef.current);
        }

        pingTimeoutRef.current = setTimeout(() =>
        {
            sendMessage({ type: MessageTypes.PING });
        }, 1000);
    }, [ sendMessage ]);

    useEffect(() =>
    {
        sendMessage({ type: MessageTypes.PING });
        const cleanup = addMessageHandler(messageHandler);

        return () =>
        {
            if (pingTimeoutRef.current)
            {
                clearTimeout(pingTimeoutRef.current);
            }
            cleanup();
        };
    }, [ messageHandler, addMessageHandler, sendMessage ]);

    const renderStatusIcon = () =>
    {
        switch (connectionStatus)
        {
            case 'ok':
                return <OkIcon />;
            case 'degraded':
                return <DegradedSpeedIcon />;
            case 'error':
                return <NotResponsiveIcon />;
            default:
                return <UnknownErrorIcon />;
        }
    };

    return (
        <Stack direction="row" alignItems="center" spacing={ 1 }>
            { renderStatusIcon() }
            <Typography variant="body1" fontWeight={ 500 }>מדש</Typography>
        </Stack>
    );
}

function SystemStatusBoardContent()
{
    return (
        <Stack spacing={ 2 }>
            <SelfTestStatusBoard />
        </Stack>
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
        />
    );
}