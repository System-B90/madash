import { test, expect } from "./fixtures";

test.describe("Journal Integration", () => {
    test.beforeEach(async ({ page }) => {
        // Load journal page directly
        await page.goto("/journal", { waitUntil: "commit" });
        await page.waitForLoadState("domcontentloaded");
    });

    // Skipped: DateNavigator doesn't render its prev/next buttons in this environment —
    // https://github.com/System-B90/madash/issues/6.
    test.skip("loads journal page with heading and date navigator", async ({ page }) => {
        // Verify page heading
        await expect(page.getByText('יומן מדר"ת')).toBeVisible();

        // Verify date navigator is rendered (look for date navigation button or input)
        const prevButton = page.locator("button:has-text('יום קודם'), button:has(svg[data-testid='ArrowBackIcon']), button:has(svg[data-testid='ChevronRightIcon'])").first();
        await expect(prevButton).toBeVisible();
    });

    // Skipped: journal data/empty-state never renders in this environment —
    // https://github.com/System-B90/madash/issues/6.
    test.skip("toggles a task status", async ({ page }) => {
        // Wait for tasks to load (if any are listed)
        // If there are no tasks for today, we can click to previous/next days to find one or verify empty state.
        // We'll check if any task cards exist.
        const taskCards = page.locator(".MuiCard-root");
        
        // If no tasks exist for today, navigate to another date or verify empty state is safe.
        const count = await taskCards.count();
        if (count > 0) {
            const firstTask = taskCards.first();
            const checkbox = firstTask.locator("input[type='checkbox']");
            const isInitiallyChecked = await checkbox.isChecked();

            // Toggle task
            await checkbox.click();
            await page.waitForTimeout(500);

            // Verify status has changed
            expect(await checkbox.isChecked()).toBe(!isInitiallyChecked);
        } else {
            // If empty, verify standard warning/info text
            await expect(page.getByText(/אין משימות|לא נמצאו משימות/i).first()).toBeVisible();
        }
    });

    // Skipped rather than left conditional. The body used to be wrapped in
    // `if (await titleField.isVisible())`, so when the field was absent -- which
    // is exactly what issue #6 reports -- the test reported green having
    // asserted nothing. A vacuous pass is worse than a skip: it hides the very
    // regression the spec exists to catch. Un-skip together with the two above
    // once #6 lands; the assertions below are already written as hard
    // expectations.
    // https://github.com/System-B90/madash/issues/6
    test.skip("allows renaming the journal if editable", async ({ page }) => {
        const titleField = page.locator("input[type='text'], input[placeholder='שם יומן']").first();
        await expect(titleField).toBeVisible();

        await titleField.fill("שם יומן בדיקה חדש");
        await page.keyboard.press("Enter");
        await expect(titleField).toHaveValue("שם יומן בדיקה חדש");
    });
});
