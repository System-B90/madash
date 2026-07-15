export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { ApiSuccess, catchHandler } from '@/api-server/common';
import { HiveClient } from '@/api-server/hive/client';
import { createHiveClientFromSession } from '@/api-server/hive/session-client';
import { authOptions } from '@/api-server/hive/sso';
import { UserNotLoggedInError } from '@/api-shared/errors';
import type { HivePrometheusStatus } from '@/api-shared/hive-prometheus-status';
import type { AuthSessionData } from '@/api-shared/session';


const FETCH_TIMEOUT_MS = 8000;

function overloadThreshold(): number
{
    const raw = process.env.HIVE_PROMETHEUS_OVERLOAD_QUERY_THRESHOLD;
    if (raw === undefined || raw === '')
    {
        return 20;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 20;
}

async function probePrometheus(
    base: string,
    hiveClient: HiveClient,
): Promise<{ reachable: boolean; overloaded: boolean; }>
{
    const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

    try
    {
        const readyRes = await hiveClient.fetchWithTokenCookie(`${base}/-/ready`, {
            method: 'GET',
            headers: {
                Accept: 'text/plain, application/json',
            },
            cache: 'no-store',
            signal,
        });

        if (!readyRes.ok)
        {
            return { reachable: false, overloaded: false };
        }

        const threshold = overloadThreshold();
        const q = encodeURIComponent('sum(prometheus_engine_queries)');
        const queryRes = await hiveClient.fetchWithTokenCookie(`${base}/api/v1/query?query=${q}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!queryRes.ok)
        {
            return { reachable: true, overloaded: false };
        }

        const body = (await queryRes.json()) as {
            status?: string;
            data?: { result?: Array<{ value?: [ number, string ]; }>; };
        };

        if (body.status !== 'success' || !body.data?.result?.length)
        {
            return { reachable: true, overloaded: false };
        }

        const v = body.data.result[ 0 ]?.value?.[ 1 ];
        const n = parseFloat(String(v));
        if (Number.isNaN(n))
        {
            return { reachable: true, overloaded: false };
        }

        return { reachable: true, overloaded: n >= threshold };
    }
    catch
    {
        return { reachable: false, overloaded: false };
    }
}

export async function GET(request: NextRequest)
{
    try
    {
        const session = await getServerSession(authOptions);
        if (!session)
        {
            throw new UserNotLoggedInError();
        }

        const raw = process.env.HIVE_PROMETHEUS_URL?.trim();
        if (!raw)
        {
            const payload: HivePrometheusStatus = { configured: false };
            return ApiSuccess(payload);
        }

        const hiveClient = await createHiveClientFromSession(session as AuthSessionData);
        const base = raw.replace(/\/$/, '');
        const { reachable, overloaded } = await probePrometheus(base, hiveClient);
        const payload: HivePrometheusStatus = {
            configured: true,
            reachable,
            overloaded,
        };
        return ApiSuccess(payload);
    }
    catch (e)
    {
        return catchHandler(request, e);
    }
}
