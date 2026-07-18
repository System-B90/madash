import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/api-server/hive/sso";
import { AuthSessionData } from "@/api-shared/session";
import { signWsTicket } from "@/settings";

/**
 * Mints a short-lived HMAC-signed ticket bound to the current user.
 * The WS client presents it on connect so the session server can bind
 * the socket to a real user id (rather than a client-supplied UUID).
 */
export async function GET() {
    const session = (await getServerSession(authOptions)) as AuthSessionData | null;
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json({ ticket: signWsTicket(session.user.id) });
}
