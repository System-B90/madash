import { type CourseUser, StatusEnum } from '@/api-shared/hive-types';

/** Response from GET /api/status/hive/toilet-queue */
export interface ToiletQueue
{
    /** Students who asked to go and are waiting for approval (`Toilet Request`). */
    waiting: number;
    /** Students currently out (`Toilet`). */
    out: number;
}

export function countToiletQueue(users: Pick<CourseUser, 'status'>[]): ToiletQueue
{
    let waiting = 0;
    let out = 0;
    for (const u of users)
    {
        if (u.status === StatusEnum.Toilet_Request) waiting++;
        else if (u.status === StatusEnum.Toilet) out++;
    }
    return { waiting, out };
}
