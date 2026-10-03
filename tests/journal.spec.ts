import { test, expect } from "./fixtures";

/**
 * Journal page (madash#6). The day buttons are found by their aria-labels:
 * MUI strips icon data-testids from production builds, which is why the old
 * icon-based selectors never matched in CI.
 */
test.describe("Journal Integration", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/journal", { waitUntil: "commit" });
        await page.waitForLoadState("domcontentloaded");
    });

    test("loads journal page with heading and date navigator", async ({ page }) => {
        await expect(page.getByText('יומן מדר"ת')).toBeVisible();
        await expect(page.getByRole("button", { name: "יום קודם" })).toBeVisible();
        await expect(page.getByRole("button", { name: "יום הבא" })).toBeVisible();
    });

    // madash is stateless (no DB): a journal has no tasks, so the list must
    // show its empty state rather than nothing at all.
    test("shows the task list empty state", async ({ page }) => {
        await expect(page.getByText("אין משימות ביום זה")).toBeVisible({ timeout: 10_000 });
    });

    test("a past day is read-only", async ({ page }) => {
        await page.getByRole("button", { name: "יום קודם" }).click();
        await expect(page.getByLabel("הכנס שם ליום")).toBeDisabled({ timeout: 10_000 });
    });

    test("allows renaming today's journal", async ({ page }) => {
        const titleField = page.getByLabel("הכנס שם ליום");
        await expect(titleField).toBeEditable({ timeout: 10_000 });

        await titleField.fill("שם יומן בדיקה חדש");
        await expect(titleField).toHaveValue("שם יומן בדיקה חדש");
        await expect(page.getByRole("alert")).toHaveCount(0);
    });
});
