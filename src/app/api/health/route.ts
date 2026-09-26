import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness probe for the container healthcheck. Deliberately dependency-free:
 * Hive being down must not mark madash unhealthy (the status board reports that).
 */
export function GET()
{
    return NextResponse.json({ status: 'ok' });
}
