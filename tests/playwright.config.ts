import * as path from "path";
import { devices } from "@playwright/test";
import { definePlaywrightConfig } from "@system-b90/test-kit/playwright";
import { AUTH_STATE_PATH } from "@system-b90/test-kit/auth";

/**
 * Playwright configuration for MADASH integration tests.
 *
 * Usage:
 * 1. Run tests: npm run test:e2e
 * 2. Run with UI: npm run test:e2e:ui
 *
 * The test suite:
 * - Authenticates via Hive SSO (admin:Password1) in the setup project
 * - Saves auth state to .auth/user.json for test reuse
 * - Requires a running MADASH instance at BASE_URL (default: https://madash.dev)
 * - Runs in Hebrew locale (he-IL) with Jerusalem timezone (shared default from @system-b90/test-kit)
 *
 * Environment Variables:
 * - BASE_URL: Override default MADASH URL (default: "https://madash.dev")
 */
export default definePlaywrightConfig({
    timeout: 15_000,
    fullyParallel: false,
    workers: 1,

    use: {
        baseURL: process.env.BASE_URL ?? "https://madash.dev",
        screenshot: "only-on-failure",
        video: "on-first-retry",
        trace: "on-first-retry",
    },

    projects: [
        {
            name: "login",
            testMatch: /login\.spec\.ts/,
            use: {
                ...devices[ "Desktop Chrome" ],
                storageState: { cookies: [], origins: [] },
            },
        },
        {
            name: "setup",
            testMatch: /auth\.setup\.ts/,
            timeout: 240_000,
        },
        {
            name: "chromium",
            testIgnore: [ /login\.spec\.ts/, /auth\.setup\.ts/, /backend/, /worktrees/, /\.claude/ ],
            use: {
                ...devices[ "Desktop Chrome" ],
                storageState: path.join(__dirname, AUTH_STATE_PATH),
            },
            dependencies: [ "setup" ],
        },
    ],
});
