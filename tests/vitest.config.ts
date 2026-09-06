import path from "path";
import { defineSharedVitestConfig } from "@system-b90/test-kit/vitest";

export default defineSharedVitestConfig({
    include: [ "tests/backend/**/*.test.ts" ],
    alias: {
        "@": path.resolve(__dirname, "../src"),
    },
    test: {
        env: {
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "test-secret",
            NEXT_PUBLIC_HIVE_URL: process.env.NEXT_PUBLIC_HIVE_URL ?? "https://hive.org",
            HIVE_CLIENT_ID: process.env.HIVE_CLIENT_ID ?? "test-client-id",
            HIVE_CLIENT_SECRET: process.env.HIVE_CLIENT_SECRET ?? "test-client-secret",
            WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY: process.env.WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY ?? "test-auth-key",
        },
    },
});
