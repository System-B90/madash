import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [
        tsconfigPaths({
            projects: [ path.resolve(__dirname, "../tsconfig.json") ],
        }),
    ],
    test: {
        environment: "node",
        include: [ "tests/backend/**/*.test.ts" ],
        exclude: [ ...configDefaults.exclude, "**/.claude/**", "**/worktrees/**" ],
        alias: {
            "@": path.resolve(__dirname, "../src"),
        },
        env: {
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "test-secret",
            NEXT_PUBLIC_HIVE_URL: process.env.NEXT_PUBLIC_HIVE_URL ?? "https://hive.org",
            HIVE_CLIENT_ID: process.env.HIVE_CLIENT_ID ?? "test-client-id",
            HIVE_CLIENT_SECRET: process.env.HIVE_CLIENT_SECRET ?? "test-client-secret",
            WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY: process.env.WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY ?? "test-auth-key",
        },
    },
});
