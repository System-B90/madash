export const dynamic = "force-dynamic";

import { ApiSuccess, catchHandler } from "@/api-server/common";
import { NextRequest } from "next/server";
import createHiveClient from "@/api-server/hive/session-client";
export async function GET(
    request: NextRequest
)
{
    try
    {
        const hiveClient = await createHiveClient();
        const data = await hiveClient.getClasses();
        return ApiSuccess(data);
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}
