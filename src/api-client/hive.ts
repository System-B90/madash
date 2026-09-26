import { safeApiFetcher } from "@/api-client/common";
import { CourseUser, Class } from "@/api-shared/hive-types";
import type { ToiletQueue } from '@/api-shared/toilet-queue';

export async function apiGetStudents()
{
    return (await safeApiFetcher('/api/hive/students')) as Array<CourseUser>;
}

export async function apiGetClasses()
{
    return (await safeApiFetcher('/api/hive/classes')) as Array<Class>;
}

export async function apiGetOpenHelpsCount(): Promise<{ count: number; }>
{
    return (await safeApiFetcher('/api/status/hive/open-helps')) as { count: number; };
}

export async function apiGetToiletQueue(): Promise<ToiletQueue>
{
    return (await safeApiFetcher('/api/status/hive/toilet-queue')) as ToiletQueue;
}
