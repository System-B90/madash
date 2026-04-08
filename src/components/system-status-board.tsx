import { ElementType, useCallback, useEffect, useRef, useState } from "react";
import { IconProps, Stack, Tooltip, Typography } from "@mui/material";
import DnsIcon from '@mui/icons-material/Dns';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import ReportIcon from '@mui/icons-material/Report';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { apiGetHivePrometheusStatus } from '@/api-client/hive-prometheus-status';
import CollapsableCard from "@/components/collapsable-card";
import { useAuth } from "@/components/auth-provider";
import { MessageHandlerType } from "@/components/session-ws";
import { MessageTypes } from "@/session-common";
import type { HivePrometheusStatus } from '@/api-shared/hive-prometheus-status';

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

function PrometheusOkIcon()
{
    return <StatusIconWrapper icon={ CheckCircleIcon } name="פרומתאוס Hive — תקין" color="success" />;
}

function PrometheusDownIcon()
{
    return <StatusIconWrapper icon={ SignalWifiStatusbarConnectedNoInternet4Icon } name="פרומתאוס Hive לא זמין או לא מוכן" color="error" />;
}

function PrometheusOverloadedIcon()
{
    return <StatusIconWrapper icon={ SpeedIcon } name="פרומתאוס Hive — עומס גבוה" color="warning" />;
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

const HIVE_PROMETHEUS_POLL_MS = 20_000;

function NotConfiguredIcon()
{
    return (
        <Tooltip title="לא הוגדרה כתובת פרומתאוס (HIVE_PROMETHEUS_URL)" arrow>
            <HelpOutlineIcon color="action" />
        </Tooltip>
    );
}

function HivePrometheusStatusBoard()
{
    const [ status, setStatus ] = useState<HivePrometheusStatus | null>(null);

    const refresh = useCallback(async () =>
    {
        try
        {
            const data = await apiGetHivePrometheusStatus();
            setStatus(data);
        }
        catch
        {
            setStatus({
                configured: true,
                reachable: false,
                overloaded: false,
            });
        }
    }, []);

    useEffect(() =>
    {
        void refresh();
        const id = setInterval(() => void refresh(), HIVE_PROMETHEUS_POLL_MS);
        return () => clearInterval(id);
    }, [ refresh ]);

    const renderStatusIcon = () =>
    {
        if (status === null)
        {
            return <UnknownErrorIcon />;
        }
        if (!status.configured)
        {
            return <NotConfiguredIcon />;
        }
        if (!status.reachable)
        {
            return <PrometheusDownIcon />;
        }
        if (status.overloaded)
        {
            return <PrometheusOverloadedIcon />;
        }
        return <PrometheusOkIcon />;
    };

    return (
        <Stack direction="row" alignItems="center" spacing={ 1 }>
            { renderStatusIcon() }
            <Typography variant="body1" fontWeight={ 500 }>פרומתאוס Hive</Typography>
        </Stack>
    );
}

function SystemStatusBoardContent()
{
    return (
        <Stack spacing={ 2 }>
            <SelfTestStatusBoard />
            <HivePrometheusStatusBoard />
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