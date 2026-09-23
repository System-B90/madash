export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/api-server/hive/sso";
import { UserNotLoggedInError } from "@/api-shared/errors";
import { AuthSessionData } from "@/api-shared/session";

/**
 * The single authentication gate for madash's data routes.
 *
 * Returns a 401 response to return as-is, or `null` when the caller is
 * authenticated and the handler should proceed. `session.user.id` is the same
 * predicate `/api/ws-ticket` already used, so the two cannot disagree about
 * what "logged in" means.
 *
 * The body carries the app's usual `{ status: -1, error }` envelope alongside
 * the 401. `safeApiFetcher` parses the body regardless of HTTP status and
 * branches on `status`, so a browser caller surfaces this as a
 * UserNotLoggedInError rather than an opaque transport failure — while a
 * non-browser caller still sees a real 401 instead of an HTTP 200.
 */
export async function denyUnauthenticated(): Promise<NextResponse | null>
{
    const session = (await getServerSession(authOptions)) as AuthSessionData | null;
    if (session?.user?.id)
    {
        return null;
    }

    const error = new UserNotLoggedInError("נדרשת התחברות");
    return new NextResponse(
        JSON.stringify({ status: -1, error: { ...error, name: error.name } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
    );
}
