'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import SpeedIcon from '@mui/icons-material/Speed';
import { useEffect, useState } from 'react';

import { apiGetOpenHelpsCount } from '@/api-client/hive';
import { apiGetHivePrometheusStatus } from '@/api-client/hive-prometheus-status';
import type { HivePrometheusStatus } from '@/api-shared/hive-prometheus-status';
import { useStudents } from '@/components/students-provider';
import OpenHelpsGauge, { HELPS_PER_STUDENT_DANGER } from '@/components/system-status-board/open-helps-gauge';
import { ServiceStatusTile, StatusGlyph } from '@/components/system-status-board/shared-ui';

const HIVE_HEALTH_POLL_MS = 20_000;

function mapHiveStatus(data: HivePrometheusStatus | null): 'loading' | 'unconfigured' | 'ok' | 'overloaded' | 'down'
{
    if (data === null) return 'loading';
    if (!data.configured) return 'unconfigured';
    if (!data.reachable) return 'down';
    if (data.overloaded) return 'overloaded';
    return 'ok';
}

function hiveDetail(state: ReturnType<typeof mapHiveStatus>): string
{
    switch (state)
    {
        case 'loading': return 'בודק זמינות…';
        case 'unconfigured': return 'המערכת לא הוגדרה לניטור';
        case 'ok': return 'שירות זמין ותקין';
        case 'overloaded': return 'עומס גבוה על התשתית';
        case 'down': return 'שירות לא זמין או לא מגיב';
    }
}

function HiveHealthGlyph({ state }: { state: ReturnType<typeof mapHiveStatus>; })
{
    switch (state)
    {
        case 'loading': return <StatusGlyph icon={ HourglassEmptyIcon } title="בודק…" color="action" pulse />;
        case 'unconfigured': return <StatusGlyph icon={ HelpOutlineIcon } title="ניטור הייב לא הוגדר בשרת" color="action" />;
        case 'ok': return <StatusGlyph icon={ CheckCircleIcon } title="הייב זמין" color="success" />;
        case 'overloaded': return <StatusGlyph icon={ SpeedIcon } title="הייב עמוס" color="warning" />;
        case 'down': return <StatusGlyph icon={ SignalWifiStatusbarConnectedNoInternet4Icon } title="הייב לא זמין" color="error" />;
    }
}

export default function HiveHealthRow()
{
    const [ data, setData ] = useState<HivePrometheusStatus | null>(null);
    const [ openHelpsCount, setOpenHelpsCount ] = useState<number | null>(null);
    const [ helpsLoading, setHelpsLoading ] = useState(true);

    useEffect(() =>
    {
        let alive = true;

        const tick = async () =>
        {
            const [ promSettled, helpsSettled ] = await Promise.allSettled([
                apiGetHivePrometheusStatus(),
                apiGetOpenHelpsCount(),
            ]);

            if (!alive) return;

            const promResult: HivePrometheusStatus =
                promSettled.status === 'fulfilled'
                    ? promSettled.value
                    : {
                        configured: true,
                        reachable: false,
                        overloaded: false,
                    };

            const helps = helpsSettled.status === 'fulfilled' ? helpsSettled.value.count : null;

            setData(promResult);
            setOpenHelpsCount(helps);
            setHelpsLoading(false);
        };

        tick();
        const interval = setInterval(tick, HIVE_HEALTH_POLL_MS);
        return () =>
        {
            alive = false;
            clearInterval(interval);
        };
    }, []);

    const { students, isLoading: studentsLoading } = useStudents();
    const state = mapHiveStatus(data);
    const detailBase = hiveDetail(state);
    const denom = Math.max(students.length, 1);

    const ratioForDetail = openHelpsCount !== null && !(studentsLoading && students.length === 0)
        ? openHelpsCount / denom
        : null;

    const helpsDanger = ratioForDetail !== null && ratioForDetail > HELPS_PER_STUDENT_DANGER;
    const detail = helpsDanger ? `${detailBase} · יותר מדי הלפים` : detailBase;

    return (
        <ServiceStatusTile
            label="הייב"
            detail={ detail }
            rootSx={ { minHeight: 36 } } // Removed `py: 0.5` override to allow flexible wrapping space
            mid={ <OpenHelpsGauge openHelpsCount={ openHelpsCount } helpsLoading={ helpsLoading } /> }
            glyph={ <HiveHealthGlyph state={ state } /> }
        />
    );
}
