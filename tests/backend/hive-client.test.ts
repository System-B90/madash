import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { HiveClient } from "@/api-server/hive/client";
import { HiveClientError } from "@/api-shared/errors";

describe("HiveClient", () => {
    const nextPublicHiveUrl = "https://hive.test";
    
    beforeEach(() => {
        vi.stubEnv("NEXT_PUBLIC_HIVE_URL", nextPublicHiveUrl);
        vi.spyOn(globalThis, "fetch").mockImplementation(() => {
            return Promise.reject(new Error("Fetch mock not configured"));
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it("makes a successful getUsers query", async () => {
        const mockUsers = [{ id: 1, display_name: "חניך א" }];
        
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify(mockUsers),
        } as Response);

        const client = new HiveClient("access-token-123");
        const users = await client.getUsers({ role: "student" });

        expect(globalThis.fetch).toHaveBeenCalledWith(
            `${nextPublicHiveUrl}/api/core/management/users/?role=student`,
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer access-token-123",
                    "Content-Type": "application/json",
                },
                body: undefined,
            }
        );
        expect(users).toEqual(mockUsers);
    });

    it("makes a successful getClasses query", async () => {
        const mockClasses = [{ id: 10, name: "כיתה א", users: [1, 2] }];
        
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify(mockClasses),
        } as Response);

        const client = new HiveClient("access-token-123");
        const classes = await client.getClasses();

        expect(globalThis.fetch).toHaveBeenCalledWith(
            `${nextPublicHiveUrl}/api/core/management/classes/`,
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer access-token-123",
                    "Content-Type": "application/json",
                },
                body: undefined,
            }
        );
        expect(classes).toEqual(mockClasses);
    });

    it("makes a successful getOpenHelpsCount query", async () => {
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ count: 5 }),
        } as Response);

        const client = new HiveClient("access-token-123");
        const count = await client.getOpenHelpsCount();

        expect(count).toBe(5);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/core/help/?limit=1&help_status__in=Open"),
            expect.any(Object)
        );
    });

    it("throws HiveClientError when getOpenHelpsCount returns invalid count format", async () => {
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ count: "invalid-string" }),
        } as Response);

        const client = new HiveClient("access-token-123");
        await expect(client.getOpenHelpsCount()).rejects.toThrow(HiveClientError);
    });

    it("retries on status 500 automatically", async () => {
        // First call returns 500, second call returns success
        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: "Internal Error"
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify([{ id: 1 }])
            } as Response);

        const client = new HiveClient("access-token-123");

        // Mock setTimeout to return immediately
        const originalSetTimeout = globalThis.setTimeout;
        globalThis.setTimeout = vi.fn().mockImplementation((fn: any) => fn()) as any;

        const users = await client.getUsers({});
        expect(users).toEqual([{ id: 1 }]);
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);

        globalThis.setTimeout = originalSetTimeout;
    });

    it("refreshes token on 401 when refresh token is available and retries", async () => {
        // First call returns 401 Unauthorized
        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: "Unauthorized"
            } as Response) // First request
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ access: "new-access-token", refresh: "new-refresh-token" })
            } as Response) // Refresh request
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => JSON.stringify([{ id: 1 }])
            } as Response); // Retried request

        const client = new HiveClient("old-access-token", "refresh-token-value");
        const users = await client.getUsers({});

        expect(users).toEqual([{ id: 1 }]);
        
        // Assert refresh request
        expect(globalThis.fetch).toHaveBeenNthCalledWith(
            2,
            `${nextPublicHiveUrl}/api/core/token/refresh/`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh: "refresh-token-value" })
            }
        );

        // Assert retried request has new token
        expect(globalThis.fetch).toHaveBeenNthCalledWith(
            3,
            `${nextPublicHiveUrl}/api/core/management/users/?`,
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer new-access-token",
                    "Content-Type": "application/json",
                },
                body: undefined,
            }
        );
    });

    it("throws HiveClientError on 401 when refresh token is missing", async () => {
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: "Unauthorized"
        } as Response);

        const client = new HiveClient("old-access-token"); // No refresh token provided
        await expect(client.getUsers({})).rejects.toThrow("הטוקן אינו תקף, נדרשת התחברות מחדש");
    });

    it("fetchWithTokenCookie injects Authorization cookies", async () => {
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
        } as Response);

        const client = new HiveClient("cookie-token-123");
        await client.fetchWithTokenCookie("https://hive.test/prometheus");

        const lastCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
        expect(lastCallArgs[0]).toBe("https://hive.test/prometheus");
        
        const headers = lastCallArgs[1]?.headers as Headers;
        expect(headers.get("Cookie")).toBe("token=cookie-token-123");
    });
});
