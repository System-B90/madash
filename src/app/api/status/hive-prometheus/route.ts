export const dynamic = 'force-dynamic';

import { UserNotLoggedInError } from '@/api-shared/errors';
import type { HivePrometheusStatus } from '@/api-shared/hive-prometheus-status';
import { ApiSuccess, catchHandler } from '@/api-server/common';
import { authOptions } from '@/api-server/hive/sso';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';

const FETCH_TIMEOUT_MS = 8000;

function prometheusHeaders(): HeadersInit
{
    const headers: Record<string, string> = {
        Accept: 'text/plain, application/json',
    };
    const token = process.env.HIVE_PROMETHEUS_BEARER_TOKEN?.trim();
    if (token)
    {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

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

async function probePrometheus(base: string): Promise<{ reachable: boolean; overloaded: boolean; }>
{
    const headers = prometheusHeaders();
    const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

    try
    {
        const readyRes = await fetch(`${base}/-/ready`, {
            method: 'GET',
            headers,
            cache: 'no-store',
            signal,
        });

        if (!readyRes.ok)
        {
            return { reachable: false, overloaded: false };
        }

        const threshold = overloadThreshold();
        const q = encodeURIComponent('sum(prometheus_engine_queries)');
        const queryRes = await fetch(`${base}/api/v1/query?query=${q}`, {
            headers: { ...headers, Accept: 'application/json' },
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

        const base = raw.replace(/\/$/, '');
        const { reachable, overloaded } = await probePrometheus(base);
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
