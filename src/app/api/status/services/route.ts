export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { ApiSuccess, catchHandler } from '@/api-server/common';
import { createHiveClientFromSession } from '@/api-server/hive/session-client';
import { authOptions } from '@/api-server/hive/sso';
import { applyHiveLoad, probeHivePrometheus } from '@/api-server/service-health/hive-load';
import { getServiceHealthMonitor } from '@/api-server/service-health/monitor';
import { UserNotLoggedInError } from '@/api-shared/errors';
import type { ServicesHealthResponse } from '@/api-shared/service-health';
import type { AuthSessionData } from '@/api-shared/session';

export async function GET(request: NextRequest)
{
    try
    {
        const session = await getServerSession(authOptions);
        if (!session) throw new UserNotLoggedInError();

        const services = await getServiceHealthMonitor().getAll();
        const hive = services.find((s) => s.id === 'hive');
        if (!hive || hive.state !== 'up') return ApiSuccess(services satisfies ServicesHealthResponse, 'no-store');

        // Shared, cached liveness + this viewer's token-authenticated load check.
        const load = await probeHivePrometheus(await createHiveClientFromSession(session as AuthSessionData));
        const payload: ServicesHealthResponse = services.map((s) => (s === hive ? applyHiveLoad(s, load) : s));
        return ApiSuccess(payload, 'no-store');
    }
    catch (e)
    {
        return catchHandler(request, e);
    }
}
