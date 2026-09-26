'use client';

import type { SxProps, Theme } from '@mui/material/styles';

import { apiGetOpenHelpsCount } from '@/api-client/hive';
import { apiGetHivePrometheusStatus } from '@/api-client/hive-prometheus-status';
import type { HivePrometheusStatus } from '@/api-shared/hive-prometheus-status';
import HiveGenericIcon from '@/components/icons/hive';
import { useStudents } from '@/components/students-provider';
import OpenHelpsGauge, { HELPS_PER_STUDENT_DANGER } from '@/components/system-status-board/open-helps-gauge';
import { DEFAULT_STATE_DETAIL, ServiceHealthTile, ServiceIcon, type TileState } from '@/components/system-status-board/shared-ui';
import { usePolling } from '@/components/system-status-board/use-polling';

const HIVE_HEALTH_POLL_MS = 20_000;
/** Hive serves its own logo; the generic mark covers Hive being unreachable. */
// Hive's own icon is light-coloured; render it black on the light theme.
const HIVE_ICON_SX: SxProps<Theme> = (theme) => theme.applyStyles('light', { filter: 'brightness(0)' });
const HIVE_ICON_URL = `${(process.env.NEXT_PUBLIC_HIVE_URL ?? '').replace(/\/$/, '')}/static/icon.svg`;

export function hiveTileState(data: HivePrometheusStatus | null): TileState
{
    if (data === null) return 'loading';
    if (!data.configured) return 'unconfigured';
    if (!data.reachable) return 'down';
    if (data.overloaded) return 'degraded';
    return 'up';
}

const HIVE_DOWN: HivePrometheusStatus = { configured: true, reachable: false, overloaded: false };

export default function HiveHealthRow()
{
    const status = usePolling(apiGetHivePrometheusStatus, HIVE_HEALTH_POLL_MS, () => HIVE_DOWN);
    // Wrapped so "not fetched yet" (null) stays distinct from "fetch failed" ({ count: null }).
    const helpsResult = usePolling(
        async (): Promise<{ count: number | null; }> => ({ count: (await apiGetOpenHelpsCount()).count }),
        HIVE_HEALTH_POLL_MS,
        () => ({ count: null }),
    );
    const helpsLoading = helpsResult === null;
    const helps = helpsResult?.count ?? null;

    const { students, isLoading: studentsLoading } = useStudents();
    const state = hiveTileState(status);

    const studentsKnown = !(studentsLoading && students.length === 0);
    const helpsDanger = helps !== null && studentsKnown && helps / Math.max(students.length, 1) > HELPS_PER_STUDENT_DANGER;

    const detailBase = state === 'degraded' ? 'עומס גבוה על התשתית' : DEFAULT_STATE_DETAIL[ state ];
    const detail = helpsDanger ? `${detailBase} · יותר מדי הלפים` : detailBase;

    return (
        <ServiceHealthTile
            testId="service-tile-hive"
            label="הייב"
            icon={ <ServiceIcon src={ HIVE_ICON_URL } icon={ HiveGenericIcon } imgSx={ HIVE_ICON_SX } /> }
            state={ state }
            detail={ detail }
            mid={ <OpenHelpsGauge openHelpsCount={ helps } helpsLoading={ helpsLoading } /> }
        />
    );
}
