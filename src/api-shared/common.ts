export const HIVE_URL = process.env.HIVE_URL || 'https://hive.org';

export interface ApiResponseJson<TData = unknown, TError = unknown>
{
    status: number;
    data?: TData;
    error?: TError;
}

export type Keys<T> = keyof T;
export function getKeysOfObject<T extends object>(obj: T): Keys<T>[]
{
    return Object.keys(obj) as Keys<T>[];
}
