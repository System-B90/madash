import { AUTH_STATE_PATH } from "@system-b90/test-kit/auth";

import { test, expect, SELECTORS, gotoAppHome, testId } from "./fixtures";

test.describe("Hadas Calls Integration", () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate and load application home
        await gotoAppHome(page);
    });

    test("performs a complete call-to-hadas workflow (create -> update state -> delete)", async ({ page }) => {
        // 1. Verify widgets are visible
        const callCard = page.locator(SELECTORS.callStudentToHadasCard);
        await expect(callCard).toBeVisible();

        const statusCard = page.locator(SELECTORS.calledToHadasCard);
        await expect(statusCard).toBeVisible();

        // Generate unique reason for this test to avoid collision
        const uniqueReason = testId("סיבה לבדיקת אינטגרציה");

        // 2. Select a student in the MUI Select dropdown
        const selectContainer = callCard.locator(".MuiSelect-select");
        await selectContainer.click();

        // Wait for the dropdown options to appear
        const listbox = page.getByRole("listbox");
        await expect(listbox).toBeVisible();

        // Select the first student in the dropdown list
        const options = listbox.locator(".MuiMenuItem-root");
        const studentName = (await options.first().textContent())?.trim() ?? "ישראל ישראלי";
        await options.first().click();

        // Click outside the dropdown to close it
        await page.keyboard.press("Escape");

        // 3. Fill in the reason
        const reasonInput = callCard.locator(SELECTORS.reasonInput);
        await reasonInput.fill(uniqueReason);

        // 4. Click Submit to send the call
        const submitBtn = callCard.locator(SELECTORS.submitButton);
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // 5. Verify the success snackbar
        await expect(page.locator(SELECTORS.snackbar)).toContainText("נרשמה");

        // 6. Verify the call is listed in the status card
        const studentChip = statusCard.locator(SELECTORS.studentChip).filter({ hasText: studentName }).first();
        await expect(studentChip).toBeVisible();

        // Hover or click the chip to verify tooltip/details
        await studentChip.hover();
        const tooltip = page.locator(".MuiTooltip-popper");
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText(uniqueReason);

        // 7. Transition the call state (requested -> told) by clicking the action icon inside the chip
        // In single student rendering, the chip itself has an onDelete button which triggers the state changes.
        const stateActionIcon = studentChip.locator(".MuiChip-deleteIcon");
        await stateActionIcon.click();

        // Wait for update
        await page.waitForTimeout(1000);

        // State is updated to 'told'. Verify the chip is filled instead of outlined
        // In MUI, color info/variant filled represents 'told' state.
        await expect(studentChip).toHaveClass(/MuiChip-colorInfo/);

        // 8. Delete / Remove the call by clicking the action button again (representing "סמן כהגיע")
        await stateActionIcon.click();

        // Verify the student chip is removed from the status list
        await expect(studentChip).not.toBeVisible();
    });

    test("validates that submit is disabled without a student selected", async ({ page }) => {
        const callCard = page.locator(SELECTORS.callStudentToHadasCard);
        const submitBtn = callCard.locator(SELECTORS.submitButton);

        // Initially no student is selected, submit should be disabled
        await expect(submitBtn).toBeDisabled();

        // Fill in reason but keep student empty
        const reasonInput = callCard.locator(SELECTORS.reasonInput);
        await reasonInput.fill("סיבה בלי חניך");

        await expect(submitBtn).toBeDisabled();
    });
    // #32: the session broadcast works through the deployed stack. A second,
    // independent browser context sees a call made by the first without
    // reloading -- the only path for that is the WebSocket session server.
    test("a second client sees a call-to-hadas change over the WebSocket session", async ({ page, browser }) => {
        const observerContext = await browser.newContext({ storageState: AUTH_STATE_PATH });
        const observer = await observerContext.newPage();
        try {
            await gotoAppHome(observer);
            const observerStatus = observer.locator(SELECTORS.calledToHadasCard);

            const callCard = page.locator(SELECTORS.callStudentToHadasCard);
            await callCard.locator(".MuiSelect-select").click();
            const option = page.getByRole("listbox").locator(".MuiMenuItem-root").first();
            const studentName = (await option.textContent())?.trim() ?? "";
            expect(studentName).not.toBe("");
            await option.click();
            await page.keyboard.press("Escape");
            await callCard.locator(SELECTORS.reasonInput).fill(testId("סיבה לבדיקת סשן"));
            await callCard.locator(SELECTORS.submitButton).click();
            await expect(page.locator(SELECTORS.snackbar)).toContainText("נרשמה");

            const observed = observerStatus.locator(SELECTORS.studentChip).filter({ hasText: studentName }).first();
            await expect(observed).toBeVisible({ timeout: 10_000 });

            // Clean up from the first client (requested -> told -> removed);
            // the observer must see the removal too.
            const own = page.locator(SELECTORS.calledToHadasCard).locator(SELECTORS.studentChip)
                .filter({ hasText: studentName }).first();
            await own.locator(".MuiChip-deleteIcon").click();
            await expect(own).toHaveClass(/MuiChip-colorInfo/);
            await own.locator(".MuiChip-deleteIcon").click();
            await expect(observed).not.toBeVisible({ timeout: 10_000 });
        } finally {
            await observerContext.close();
        }
    });
});
