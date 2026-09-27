export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";

import { denyUnauthenticated } from "@/api-server/auth-gate";
import { ApiSuccess, catchHandler } from "@/api-server/common";
import { getMadratText, modifyMadratText } from "@/api-server/datastore";

export async function GET(
    request: NextRequest
)
{
    try
    {
        const denied = await denyUnauthenticated();
        if (denied) { return denied; }

        return ApiSuccess(await getMadratText());
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}

export async function POST(
    request: NextRequest
)
{
    try
    {
        const denied = await denyUnauthenticated();
        if (denied) { return denied; }

        const newText = await request.text();
        await modifyMadratText(newText);
        return ApiSuccess();
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}
