export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

import { ApiSuccess, catchHandler } from '@/api-server/common';
import createHiveClient from '@/api-server/hive/session-client';
import { Clearance } from '@/api-shared/hive-types';
import { countToiletQueue, type ToiletQueue } from '@/api-shared/toilet-queue';

/**
 * Hive has no status filter on users, so this counts statuses over the student
 * list (same query as /api/hive/students).
 */
export async function GET(request: NextRequest)
{
    try
    {
        const hiveClient = await createHiveClient();
        const students = await hiveClient.getUsers({ clearance__in: String(Clearance.Hanich) });
        const payload: ToiletQueue = countToiletQueue(students);
        return ApiSuccess(payload, 'no-store');
    }
    catch (e)
    {
        return catchHandler(request, e);
    }
}
