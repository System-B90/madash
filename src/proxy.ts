import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";


/**
 * Blanket authentication gate for `/api/*`.
 *
 * The per-route `denyUnauthenticated()` calls are the enforced contract and
 * are what the unit suite pins. This exists so a route added later is
 * protected by default rather than by remembering — the failure mode that put
 * six data routes on the public internet in the first place (madash#30).
 *
 * Named `proxy`, not `middleware`: Next 16 deprecated the middleware file
 * convention, and the old name builds with a warning.
 *
 * `getToken` rather than `getServerSession`: this runs on the edge
 * runtime, where the full NextAuth session callback chain is not available.
 * It reads the same JWT cookie, so the two cannot disagree about who is
 * logged in — only about how much of the session they can see, which is why
 * the routes keep their own `session.user.id` check.
 */
const PUBLIC_API_PREFIXES = [
    // NextAuth's own endpoints must stay reachable, or nobody can ever log in.
    "/api/auth",
];

export async function proxy(request: NextRequest)
{
    const { pathname } = request.nextUrl;

    // Boundary-aware: a bare startsWith would also exempt "/api/authors" and
    // anything else that merely begins with the same letters.
    const isPublic = PUBLIC_API_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (isPublic)
    {
        return NextResponse.next();
    }

    const token = await getToken({ req: request });
    if (token)
    {
        return NextResponse.next();
    }

    return new NextResponse(
        JSON.stringify({
            status: -1,
            error: { name: "UserNotLoggedInError", status: "נדרשת התחברות" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
    );
}

export const config = {
    matcher: [ "/api/:path*" ],
};
