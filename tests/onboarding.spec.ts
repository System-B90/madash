import { test, expect, gotoAppHome, ONBOARDING_KEY, SELECTORS } from "./fixtures";

/** Guided tours + help drawer (#77). */
test.describe("Onboarding", () => {
    test.use({ withTours: true });

    test("the home tour starts once, walks the dashboard, and stays dismissed", async ({ page }) => {
        await gotoAppHome(page);
        const card = page.getByRole("dialog", { name: "ברוכים הבאים למדש" });
        await expect(card).toBeVisible({ timeout: 10_000 });

        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog", { name: 'קריאה לחד"ס' })).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        expect(await page.evaluate((key) => localStorage.getItem(key), ONBOARDING_KEY)).toContain("home.intro");

        await page.reload();
        await expect(page.locator(SELECTORS.calledToHadasCard).first()).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(1_500);
        await expect(page.getByRole("dialog", { name: "ברוכים הבאים למדש" })).toHaveCount(0);
    });

    test("the help drawer lists the home topics and replays the tour", async ({ page }) => {
        await gotoAppHome(page);
        await expect(page.getByRole("dialog", { name: "ברוכים הבאים למדש" })).toBeVisible({ timeout: 10_000 });
        await page.keyboard.press("Escape");

        await page.getByRole("button", { name: /עזרה/ }).first().click();
        await expect(page.getByText("מקרא מצב העולם")).toBeVisible();
        await expect(page.getByText('קריאה לחד"ס, מההתחלה עד הסוף')).toBeVisible();
    });

    test("the journal has its own tour", async ({ page }) => {
        await page.goto("/journal");
        await expect(page.getByRole("dialog", { name: "בחירת יום" })).toBeVisible({ timeout: 10_000 });
    });
});
