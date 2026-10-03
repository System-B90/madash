'use client';

import type { SxProps, Theme } from '@mui/material/styles';

import { apiGetOpenHelpsCount, apiGetToiletQueue } from '@/api-client/hive';
import type { ServiceHealth, ServicesHealthResponse } from '@/api-shared/service-health';
import type { ToiletQueue } from '@/api-shared/toilet-queue';
import HiveGenericIcon from '@/components/icons/hive';
import { useStudents } from '@/components/students-provider';
import LatencySparkline from '@/components/system-status-board/latency-sparkline';
import OpenHelpsGauge, { HELPS_PER_STUDENT_DANGER } from '@/components/system-status-board/open-helps-gauge';
import { describeServiceHealth } from '@/components/system-status-board/service-health-text';
import { DEFAULT_STATE_DETAIL, ServiceHealthTile, ServiceIcon, type TileState } from '@/components/system-status-board/shared-ui';
import ToiletQueueIndicator from '@/components/system-status-board/toilet-queue-indicator';
import { usePolling } from '@/components/system-status-board/use-polling';

const HIVE_HEALTH_POLL_MS = 20_000;
/** Hive serves its own logo; the generic mark covers Hive being unreachable. */
// Hive's own icon is light-coloured; render it black on the light theme.
const HIVE_ICON_SX: SxProps<Theme> = (theme) => theme.applyStyles('light', { filter: 'brightness(0)' });
const HIVE_ICON_URL = `${(process.env.NEXT_PUBLIC_HIVE_URL ?? '').replace(/\/$/, '')}/static/icon.svg`;

/** Hive's entry in the unified services response (#54); null until it answers. */
export function hiveServiceHealth(services: ServicesHealthResponse | null): ServiceHealth | null
{
    return services?.find((s) => s.id === 'hive') ?? null;
}

export function hiveTileState(health: ServiceHealth | null): TileState
{
    return health?.state ?? 'loading';
}

export interface HiveHealth
{
    state: TileState;
    detail: string;
    /** Latency + history from the unified backend; null until it answers. */
    health: ServiceHealth | null;
    helps: number | null;
    helpsLoading: boolean;
    /** Null when the count failed to load. */
    toiletQueue: ToiletQueue | null;
    toiletLoading: boolean;
}

export const HIVE_LABEL = 'הייב';
export const HiveServiceIcon = () => <ServiceIcon src={ HIVE_ICON_URL } icon={ HiveGenericIcon } imgSx={ HIVE_ICON_SX } />;

/** Hive's health from the unified backend, plus its own widgets' sources: open helps + toilet queue. */
export function useHiveHealth(services: ServicesHealthResponse | null): HiveHealth
{
    const health = hiveServiceHealth(services);
    // Wrapped so "not fetched yet" (null) stays distinct from "fetch failed" ({ count: null }).
    const helpsResult = usePolling(
        async (): Promise<{ count: number | null; }> => ({ count: (await apiGetOpenHelpsCount()).count }),
        HIVE_HEALTH_POLL_MS,
        () => ({ count: null }),
    );
    const helpsLoading = helpsResult === null;
    const helps = helpsResult?.count ?? null;
    // Same wrapping: null = not fetched yet, { queue: null } = fetch failed.
    const toiletResult = usePolling(
        async (): Promise<{ queue: ToiletQueue | null; }> => ({ queue: await apiGetToiletQueue() }),
        HIVE_HEALTH_POLL_MS,
        () => ({ queue: null }),
    );

    const { students, isLoading: studentsLoading } = useStudents();
    const state = hiveTileState(health);

    const studentsKnown = !(studentsLoading && students.length === 0);
    const helpsDanger = helps !== null && studentsKnown && helps / Math.max(students.length, 1) > HELPS_PER_STUDENT_DANGER;

    const detailBase = health ? describeServiceHealth(health) : DEFAULT_STATE_DETAIL[ state ];
    const detail = helpsDanger ? `${detailBase} · יותר מדי הלפים` : detailBase;

    return { state, detail, health, helps, helpsLoading, toiletQueue: toiletResult?.queue ?? null, toiletLoading: toiletResult === null };
}

export default function HiveHealthRow({ hive }: { hive: HiveHealth; })
{
    return (
        <ServiceHealthTile
            testId="service-tile-hive"
            label={ HIVE_LABEL }
            icon={ <HiveServiceIcon /> }
            state={ hive.state }
            detail={ hive.detail }
            latencyMs={ hive.health?.latencyMs }
            mid={ (
                <>
                    { hive.health && <LatencySparkline history={ hive.health.history } state={ hive.health.state } /> }
                    <ToiletQueueIndicator queue={ hive.toiletQueue } loading={ hive.toiletLoading } />
                    <OpenHelpsGauge openHelpsCount={ hive.helps } helpsLoading={ hive.helpsLoading } />
                </>
            ) }
        />
    );
}
