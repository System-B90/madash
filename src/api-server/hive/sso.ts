import { buildHiveAuthOptions } from "@system-b15/hive-nextauth";

/*
 * The Hive OIDC provider, callbacks, and logger now live in
 * @system-b15/hive-nextauth. Defaults match the previous inline config
 * (Segel+Admin clearance, /login sign-in page, NEXT_PUBLIC_HIVE_URL /
 * HIVE_CLIENT_ID / HIVE_CLIENT_SECRET env wiring) and add the Bluz-level
 * hardening: token-expiry propagation into the session, a PII-safe logger,
 * and a NEXTAUTH_SECRET guard.
 */
export const authOptions = buildHiveAuthOptions();
