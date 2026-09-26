import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/api-server/hive/sso", () => ({ authOptions: { providers: [] } }));
vi.mock("@/settings", () => ({ signWsTicket: vi.fn() }));

import { GET } from "@/app/api/ws-ticket/route";
import { signWsTicket } from "@/settings";
import { getServerSession } from "next-auth";

const SESSION = {
    user: { id: "42", name: "Dana", username: "dana" },
    accessToken: "acc",
};

beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    vi.mocked(signWsTicket).mockReset().mockReturnValue("signed-ticket");
});

describe("GET /api/ws-ticket", () => {
    it("returns a ticket for an authenticated user", async () => {
        vi.mocked(getServerSession).mockResolvedValue(SESSION as never);

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ticket: "signed-ticket" });
    });

    it("signs the ticket with the session's user id", async () => {
        // The whole point of the endpoint: the socket is bound to a real,
        // server-known identity rather than a client-supplied UUID.
        vi.mocked(getServerSession).mockResolvedValue(SESSION as never);

        await GET();

        expect(signWsTicket).toHaveBeenCalledWith("42");
        expect(signWsTicket).toHaveBeenCalledTimes(1);
    });

    it("passes the app's authOptions to getServerSession", async () => {
        vi.mocked(getServerSession).mockResolvedValue(SESSION as never);

        await GET();

        expect(getServerSession).toHaveBeenCalledWith({ providers: [] });
    });
});

describe("GET /api/ws-ticket rejections", () => {
    it("401s when there is no session", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null as never);

        const response = await GET();

        expect(response.status).toBe(401);
        expect(await response.text()).toBe("Unauthorized");
    });

    it("401s when the session has no user", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ accessToken: "a" } as never);

        expect((await GET()).status).toBe(401);
    });

    it("401s when the user has no id", async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { name: "Dana" },
        } as never);

        expect((await GET()).status).toBe(401);
    });

    it("401s on an empty-string user id", async () => {
        // `?.` alone would let "" through; the truthiness check is what stops
        // a ticket being minted for an empty identity.
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "" },
        } as never);

        expect((await GET()).status).toBe(401);
    });

    it("never mints a ticket on any rejection path", async () => {
        for (const session of [ null, {}, { user: {} }, { user: { id: "" } } ]) {
            vi.mocked(getServerSession).mockResolvedValue(session as never);
            await GET();
        }

        expect(signWsTicket).not.toHaveBeenCalled();
    });
});
