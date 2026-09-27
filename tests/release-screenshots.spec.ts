import path from "node:path";

import { test, expect, gotoAppHome } from "./fixtures";
import { editor, mockRoster, preview, startEditing } from "./madrat-helpers";

/**
 * Regenerates the screenshots embedded in the release notes
 * (docs/release-notes/UNRELEASED.md). Opt-in — not part of the regular suite:
 *
 *   RELEASE_SCREENSHOTS=1 npx playwright test -c tests/playwright.config.ts tests/release-screenshots.spec.ts
 *
 * Uses the mocked roster, so no real student names end up in a public release.
 */

const OUT = path.join(__dirname, "..", "docs", "release-notes", "assets");
const shot = (name: string) => path.join(OUT, `${name}.png`);

const SAMPLE = [
    "## הודעות להיום",
    "",
    "- **08:30** — מסדר בוקר, צוות בדיקה מתייצב בחדר מבחן 1",
    "- טסטר תלמידה לעדכן את מדריכת טסט לפני ההפסקה",
    "- בודק טסט עובר על תרגיל 3 אחרי הצהריים",
    "",
    "> לא לשכוח: `git pull` לפני תחילת העבודה",
].join("\n");

test.describe("release screenshots", () => {
    test.skip(!process.env.RELEASE_SCREENSHOTS, "set RELEASE_SCREENSHOTS=1 to regenerate");
    test.setTimeout(120_000);

    let original = "";
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });
        await mockRoster(page);
        await gotoAppHome(page);
        // Keep the Next.js dev-tools badge out of the shots.
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        const res = await page.request.get("/api/madrat");
        original = res.ok() ? ((await res.json()).data ?? "") : "";
    });
    test.afterEach(async ({ page }) => {
        await page.request.post("/api/madrat", { data: original, headers: { "content-type": "text/plain" } });
    });

    test("madrat message: preview, picker and hover cards", async ({ page }) => {
        // Set through the API and reload: deterministic, no race with the box's initial load.
        await page.request.post("/api/madrat", { data: SAMPLE, headers: { "content-type": "text/plain" } });
        await page.reload();
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await expect(preview(page).locator("h2")).toHaveText("הודעות להיום");
        await expect(preview(page).getByTestId("mention").first()).toBeVisible();

        for (const scheme of [ "light", "dark" ] as const)
        {
            await page.emulateMedia({ colorScheme: scheme });
            await page.mouse.move(0, 0);
            await page.waitForTimeout(500);
            // Crop to the rendered content, not the whole (mostly empty) box.
            const box = (await preview(page).boundingBox())!;
            const content = (await preview(page).locator("> div").first().boundingBox())!;
            await page.screenshot({
                path: shot(`madrat-preview-${scheme}`),
                clip: { x: box.x, y: box.y, width: box.width, height: content.y + content.height + 20 - box.y },
            });
        }

        // Hover cards (dark), one per tag kind.
        for (const kind of [ "student", "room", "group", "segel", "checker" ])
        {
            await page.mouse.move(0, 0);
            await page.waitForTimeout(300);
            await preview(page).locator(`[data-testid=mention][data-kind=${kind}]`).first().hover();
            const card = page.locator(`[data-testid=mention-card][data-kind=${kind}]`);
            await expect(card).toBeVisible();
            await page.waitForTimeout(400);
            await page.locator(".MuiTooltip-tooltip", { has: card }).screenshot({ path: shot(`mention-card-${kind}`) });
        }

        // The grouped `@` picker, opened at the caret.
        await page.mouse.move(0, 0);
        await startEditing(page);
        await editor(page).fill("תזכורת: ");
        await editor(page).pressSequentially("@");
        const menu = page.getByTestId("mention-options");
        await expect(menu.getByRole("menuitem").first()).toBeVisible();
        await page.waitForTimeout(400);
        const e = (await editor(page).boundingBox())!;
        const m = (await menu.boundingBox())!;
        const x = Math.max(0, Math.min(e.x + e.width - 520, m.x - 16));
        await page.screenshot({
            path: shot("mention-picker"),
            clip: { x, y: e.y, width: Math.max(m.x + m.width + 16, e.x + e.width) - x, height: m.y + m.height + 16 - e.y },
        });
        await editor(page).press("Escape");
    });

});
