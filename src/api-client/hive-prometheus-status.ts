import { safeApiFetcher } from '@/api-client/common';
import type { HivePrometheusStatus } from '@/api-shared/hive-prometheus-status';

export async function apiGetHivePrometheusStatus(): Promise<HivePrometheusStatus>
{
    return (await safeApiFetcher('/api/status/hive-prometheus')) as HivePrometheusStatus;
}
