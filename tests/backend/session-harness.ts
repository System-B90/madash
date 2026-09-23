import { getServerSession } from "next-auth";
import { vi } from "vitest";

/**
 * Helpers for the `denyUnauthenticated()` gate every data route now calls.
 *
 * The importing suite must declare the mocks itself — `vi.mock` is hoisted to
 * the top of its own module and cannot be moved here:
 *
 *   vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
 *   vi.mock("@/api-server/hive/sso", () => ({ authOptions: {} }));
 */

/** Signs a request in. Tests not about the gate run in this state. */
export function signIn(id: string = "hive-user-1")
{
    vi.mocked(getServerSession).mockResolvedValue({ user: { id } } as never);
}

/** Signs a request out — no session at all. */
export function signOut()
{
    vi.mocked(getServerSession).mockResolvedValue(null as never);
}

/**
 * A session object that exists but carries no user id. The gate keys on
 * `session.user.id`, so this must be refused exactly like no session: a
 * half-built session is not an authenticated one.
 */
export function signInWithoutUserId()
{
    vi.mocked(getServerSession).mockResolvedValue({ user: {} } as never);
}

/** The `{ status, error }` envelope a refused request carries. */
export async function refusal(response: Response)
{
    return {
        httpStatus: response.status,
        body: (await response.json()) as { status: number; error?: { name?: string; }; },
    };
}
