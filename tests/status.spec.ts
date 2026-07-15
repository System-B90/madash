import { test, expect, SELECTORS, gotoAppHome } from "./fixtures";

test.describe("System Status Board Integration", () => {
    test.beforeEach(async ({ page }) => {
        await gotoAppHome(page);
    });

    // Skipped: depends on the "סטטוס קריאות" status card, which doesn't reliably
    // render post-login in CI — https://github.com/System-B15/madash/issues/4.
    test.skip("renders the status board card and service tiles", async ({ page }) => {
        // Verify status board card is visible
        const statusCard = page.locator(SELECTORS.calledToHadasCard);
        await expect(statusCard).toBeVisible();

        // Verify the board title is correct
        const boardTitle = page.getByText("מצב העולם");
        await expect(boardTitle).toBeVisible();

        // Verify the Madash (מדש) status row is visible
        const madashRow = page.locator(".MuiBox-root").filter({ hasText: /^מדש$/ }).first();
        await expect(madashRow).toBeVisible();

        // Verify the Hive (הייב) status row is visible
        const hiveRow = page.locator(".MuiBox-root").filter({ hasText: /^הייב$/ }).first();
        await expect(hiveRow).toBeVisible();
    });

    test("contains the open helps gauge widget", async ({ page }) => {
        // Find the gauge container or text inside the Hive row
        const hiveRow = page.locator(".MuiBox-root").filter({ hasText: /^הייב$/ }).first();
        const helpsText = hiveRow.locator("text=הלפים | text=עזרות | text=הלפ");
        
        // Either the loading indicator or the count is visible
        const helpsIndicator = hiveRow.locator(".MuiCircularProgress-root, svg");
        await expect(helpsIndicator.first()).toBeVisible();
    });
});
