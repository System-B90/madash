import { HIVE_URL } from "@/api-shared/common";
import { Clearance, GenderEnum } from "@/api-shared/hive-types";
import { AuthSessionData } from "@/api-shared/session";
import { AuthOptions, CallbacksOptions, Profile } from "next-auth";
import { OAuthConfig } from "next-auth/providers/index";

interface JwtTokenData
{
    user: HiveUser;
    accessToken: string;
    refreshToken: string;
    expires_at: number;
}

interface HiveSsoProfile extends Profile
{
    sub: string;
    aud: string;
    iat: number;
    at_hash: string;
    preferred_username: string;
    gender: GenderEnum;
    given_name: string;
    family_name: string;
    picture?: string | null;
    number: number | null;
    clearance: number;
    program: number | null;
    program_name: string | null;
    is_teacher: boolean;
    username: string;
    display_name: string;
    mentor: number | null;
    email?: string;
    iss: string;
    exp: number;
    auth_time: number;
    jti: string;
    api_token?: {
        access_token: string;
        refresh_token: string;
        expires_at: number;
    };
}

interface HiveUser
{
    id: string;
    name: string;
    email: string | null;
    username: string;
    clearance: number;
    program: number | null;
    gender: GenderEnum;
    display_name: string;
    is_teacher: boolean;
    temp_access_token?: string;
    temp_refresh_token?: string;
    temp_expires_at?: number;
}

const HIVE_PROVIDER: OAuthConfig<HiveSsoProfile> = {
    id: "hive",
    name: "Hive",
    type: "oauth",
    checks: [ "pkce", "state" ],
    client: {
        token_endpoint_auth_method: "client_secret_post",
    },
    issuer: `${HIVE_URL}/sso/`,
    wellKnown: `${HIVE_URL}/sso/.well-known/openid-configuration`,
    authorization: {
        params: { scope: "openid profile clearance extended_profile api" }
    },
    clientId: process.env.HIVE_CLIENT_ID,
    clientSecret: process.env.HIVE_CLIENT_SECRET,

    profile(profile)
    {
        return {
            id: profile.sub.toString(),
            name: `${profile.given_name} ${profile.family_name}`,
            email: profile.email ?? null,
            username: profile.username,
            clearance: profile.clearance,
            program: profile.program,
            gender: profile.gender,
            display_name: profile.display_name,
            is_teacher: profile.is_teacher,
            temp_access_token: profile.api_token?.access_token,
            temp_refresh_token: profile.api_token?.refresh_token,
        };
    },
};

const signInCallback: CallbacksOptions[ 'signIn' ] = async ({ user }) =>
{
    const hiveUser = user as HiveUser;

    const isAuthorized = hiveUser.clearance === Clearance.Segel || hiveUser.clearance === Clearance.Admin;

    if (!isAuthorized)
    {
        // Returning false rejects the login and redirects to the signIn page with an error parameter.
        // Alternatively, return a string (e.g., '/unauthorized') to explicitly redirect them to a custom page.
        return false;
    }

    return true;
};

const jwtCallback: CallbacksOptions[ 'jwt' ] = async ({ token, user }) =>
{
    if (user)
    {
        const hiveUser = user as HiveUser;

        const extraData: JwtTokenData = {
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
            expires_at: hiveUser.temp_expires_at ?? 0,
            accessToken: hiveUser.temp_access_token ?? "",
            refreshToken: hiveUser.temp_refresh_token ?? "",
        };
        token.data = extraData;
    }

    return token;
};

const sessionCallback: CallbacksOptions[ 'session' ] = async ({ session, token }) =>
{
    if (token && token.data)
    {
        const authSessionData: AuthSessionData = session as AuthSessionData;
        const tokenData = token.data as JwtTokenData;

        authSessionData.user = tokenData.user;
        authSessionData.accessToken = tokenData.accessToken;

        session = authSessionData;
    }
    return session;
};

export const authOptions: AuthOptions = {
    providers: [
        HIVE_PROVIDER
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        signIn: signInCallback,
        jwt: jwtCallback,
        session: sessionCallback,
    },
};
