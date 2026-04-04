import { safeApiFetcher } from "@/api-client/common";
import { CourseUser, Class } from "@/api-shared/hive-types";

export async function apiGetStudents()
{
    return (await safeApiFetcher('/api/hive/students')) as Array<CourseUser>;
}

export async function apiGetClasses()
{
    return (await safeApiFetcher('/api/hive/classes')) as Array<Class>;
}
