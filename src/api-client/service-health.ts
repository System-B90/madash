import { safeApiFetcher } from '@/api-client/common';
import type { ServicesHealthResponse } from '@/api-shared/service-health';

export async function apiGetServicesHealth(): Promise<ServicesHealthResponse>
{
    return (await safeApiFetcher('/api/status/services')) as ServicesHealthResponse;
}
