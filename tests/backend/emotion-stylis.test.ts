import createCache from "@emotion/cache";
import rtlPlugin from "@mui/stylis-plugin-rtl";
import { prefixer } from "stylis";
import { describe, expect, it } from "vitest";

describe("Emotion cache stylis plugins", () => {
    it("inserts a ::placeholder rule with the app's prefixer + rtl plugins", () => {
        // Regression: the command palette styles `input::placeholder`. The root
        // `stylis` (4.3+/4.4) prefixer, driven by Emotion's bundled stylis 4.2,
        // threw "Cannot read properties of undefined (reading 'push')" and took
        // down the whole post-auth layout. Root `stylis` is pinned to Emotion's
        // version to keep these two in step.
        const cache = createCache({ key: "muirtl", stylisPlugins: [ prefixer, rtlPlugin ] });
        expect(() =>
            cache.insert(
                ".css-test input::placeholder",
                { name: "test", styles: "opacity:0.7;" },
                cache.sheet,
                false,
            ),
        ).not.toThrow();
    });
});
