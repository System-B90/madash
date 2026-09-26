import path from "path";

import { defineSharedVitestConfig } from "@system-b90/test-kit/vitest";

/**
 * The jsdom half of the unit suite (madash#33).
 *
 * Kept as its own config rather than folded into the node one: the backend
 * tests import server modules that must not see a DOM, and a single project
 * cannot give the two halves different environments. `npm run test:unit`
 * runs both.
 */
export default defineSharedVitestConfig({
    include: [ "tests/dom/**/*.test.tsx", "tests/dom/**/*.test.ts" ],
    alias: {
        "@": path.resolve(__dirname, "../src"),
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: [ path.resolve(__dirname, "dom/setup.ts") ],
        env: {
            NEXT_PUBLIC_HIVE_URL:
                process.env.NEXT_PUBLIC_HIVE_URL ?? "https://hive.org",
        },
    },
});
