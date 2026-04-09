export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { AuthSessionData } from "@/api-shared/session";
import { HIVE_URL } from "@/api-shared/common";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; }>; }
)
{
    const { slug } = await params;

    const token = await getToken({ req: request });
    const extraData: Partial<AuthSessionData> | undefined = token?.data as any;

    if (!token || !token.data || !extraData || !extraData.accessToken)
    {
        return new NextResponse("Unauthorized: Missing session or access token", { status: 401 });
    }

    const accessToken = extraData.accessToken;

    const targetUrl = `${HIVE_URL}/api/core/management/users/${slug}/avatar/`;

    try
    {
        const hiveResponse = await fetch(targetUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Cookie: `token=${accessToken}`,
            },
        });

        if (!hiveResponse.ok)
        {
            console.log(hiveResponse);
            return new NextResponse(`Failed to fetch avatar: ${hiveResponse.statusText}`, {
                status: hiveResponse.status
            });
        }

        const imageBuffer = await hiveResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                // Pass along the exact image type (image/jpeg, image/png, etc.) provided by Hive
                "Content-Type": hiveResponse.headers.get("Content-Type") ?? "application/octet-stream",
                // Cache the image in the browser for 1 hour to reduce load on the Django server
                "Cache-Control": "private, max-age=3600",
            },
        });

    } catch (error)
    {
        console.error(`[Avatar Proxy Error for user ${slug}]:`, error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
