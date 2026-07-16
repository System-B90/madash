/*
 * The Hive client now lives in @system-b15/hive-core (request core with
 * token refresh, 401 retry, 500 backoff, cookie-auth fetch, plus getUsers /
 * getClasses / getOpenHelpsCount); this module remains the app-side import
 * path (`@/api-server/hive/client`).
 */
export { HiveClient } from "@system-b15/hive-core";
