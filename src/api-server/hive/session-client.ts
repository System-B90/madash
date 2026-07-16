import {
    createHiveClient as createHiveClientShared,
    createHiveClientFromSession as createHiveClientFromSessionShared,
} from "@system-b90/hive-nextauth";

import { HiveClient } from "@/api-server/hive/client";
import { authOptions } from "@/api-server/hive/sso";
import { AuthSessionData } from "@/api-shared/session";

export async function createHiveClientFromSession(session: AuthSessionData): Promise<HiveClient>
{
    return createHiveClientFromSessionShared(session);
}

export default async function createHiveClient(): Promise<HiveClient>
{
    return await createHiveClientShared(authOptions);
}
