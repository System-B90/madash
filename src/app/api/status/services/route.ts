export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { ApiSuccess, catchHandler } from '@/api-server/common';
import { authOptions } from '@/api-server/hive/sso';
import { getServiceHealthMonitor } from '@/api-server/service-health/monitor';
import { UserNotLoggedInError } from '@/api-shared/errors';
import type { ServicesHealthResponse } from '@/api-shared/service-health';

export async function GET(request: NextRequest)
{
    try
    {
        const session = await getServerSession(authOptions);
        if (!session) throw new UserNotLoggedInError();

        const payload: ServicesHealthResponse = await getServiceHealthMonitor().getAll();
        return ApiSuccess(payload, 'no-store');
    }
    catch (e)
    {
        return catchHandler(request, e);
    }
}
