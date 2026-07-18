import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { authOptions } from "@/api-server/hive/sso";
import { Clearance, GenderEnum } from "@/api-shared/hive-types";

describe("sso callbacks", () => {
    const { signIn, jwt, session } = authOptions.callbacks!;

    type SignInArgs = Parameters<NonNullable<typeof signIn>>[ 0 ];
    type JwtArgs = Parameters<NonNullable<typeof jwt>>[ 0 ];
    type JwtReturn = Awaited<ReturnType<NonNullable<typeof jwt>>>;
    type SessionArgs = Parameters<NonNullable<typeof session>>[ 0 ];
    type SessionReturn = Awaited<ReturnType<NonNullable<typeof session>>>;

    const baseUser = {
        id: "1",
        name: "יוסי לוי",
        email: "yossi@example.com",
        username: "yossi",
        program: null,
        gender: GenderEnum.Male,
        display_name: "יוסי לוי",
        is_teacher: false,
    };

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("signIn", () => {
        it("allows Segel clearance", async () => {
            const allowed = await signIn!({
                user: { ...baseUser, clearance: Clearance.Segel } as SignInArgs[ 'user' ],
                account: null,
                profile: undefined,
            } as SignInArgs);
            expect(allowed).toBe(true);
        });

        it("allows Admin clearance", async () => {
            const allowed = await signIn!({
                user: { ...baseUser, clearance: Clearance.Admin } as SignInArgs[ 'user' ],
                account: null,
                profile: undefined,
            } as SignInArgs);
            expect(allowed).toBe(true);
        });

        it("rejects Hanich clearance", async () => {
            const allowed = await signIn!({
                user: { ...baseUser, clearance: Clearance.Hanich } as SignInArgs[ 'user' ],
                account: null,
                profile: undefined,
            } as SignInArgs);
            expect(allowed).toBe(false);
        });

        it("rejects Checker clearance", async () => {
            const allowed = await signIn!({
                user: { ...baseUser, clearance: Clearance.Checker } as SignInArgs[ 'user' ],
                account: null,
                profile: undefined,
            } as SignInArgs);
            expect(allowed).toBe(false);
        });
    });

    describe("jwt", () => {
        beforeEach(() => {
            vi.spyOn(globalThis, "fetch").mockImplementation(() => {
                return Promise.reject(new Error("fetch mock not configured"));
            });
        });

        it("populates token.data on successful exchange", async () => {
            vi.mocked(globalThis.fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: "new-access",
                    refresh_token: "new-refresh",
                    expires_at: 12345,
                }),
            } as Response);

            const hiveUser = { ...baseUser, clearance: Clearance.Segel };
            const token = await jwt!({
                token: {},
                user: hiveUser as JwtArgs[ 'user' ],
                account: { access_token: "hive-access-token" } as JwtArgs[ 'account' ],
            } as JwtArgs) as JwtReturn & { data: unknown; };

            expect(token.data).toEqual({
                user: {
                    id: hiveUser.id,
                    name: hiveUser.name,
                    email: hiveUser.email,
                    username: hiveUser.username,
                    clearance: hiveUser.clearance,
                    program: hiveUser.program,
                    gender: hiveUser.gender,
                    display_name: hiveUser.display_name,
                    is_teacher: hiveUser.is_teacher,
                },
                expires_at: 12345,
                accessToken: "new-access",
                refreshToken: "new-refresh",
            });
        });

        it("throws when the token exchange fails", async () => {
            vi.mocked(globalThis.fetch).mockResolvedValueOnce({
                ok: false,
                status: 400,
            } as Response);

            const hiveUser = { ...baseUser, clearance: Clearance.Segel };
            await expect(
                jwt!({
                    token: {},
                    user: hiveUser as JwtArgs[ 'user' ],
                    account: { access_token: "hive-access-token" } as JwtArgs[ 'account' ],
                } as JwtArgs)
            ).rejects.toThrow("Authentication failed during token exchange.");
        });

        it("passes through an existing token when there is no fresh sign-in", async () => {
            const existingToken = { data: { accessToken: "already-set" } };
            const token = await jwt!({
                token: existingToken,
                user: undefined,
                account: null,
            } as JwtArgs);

            expect(token).toBe(existingToken);
            expect(globalThis.fetch).not.toHaveBeenCalled();
        });
    });

    describe("session", () => {
        it("populates session.user/accessToken when token.data is present", async () => {
            const tokenData = {
                user: { ...baseUser, clearance: Clearance.Segel },
                accessToken: "access-token",
                refreshToken: "refresh-token",
                expires_at: 999,
            };

            const result = await session!({
                session: { expires: "" } as SessionArgs[ 'session' ],
                token: { data: tokenData } as SessionArgs[ 'token' ],
            } as SessionArgs) as SessionReturn & { user: unknown; accessToken: unknown; };

            expect(result.user).toEqual(tokenData.user);
            expect(result.accessToken).toBe("access-token");
        });

        it("passes through unchanged when token.data is missing", async () => {
            const bareSession = { expires: "" } as SessionArgs[ 'session' ];
            const result = await session!({
                session: bareSession,
                token: {} as SessionArgs[ 'token' ],
            } as SessionArgs);

            expect(result).toBe(bareSession);
        });
    });
});
