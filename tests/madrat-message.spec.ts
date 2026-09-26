import type { Page } from "@playwright/test";

import { test, expect, gotoAppHome } from "./fixtures";

/**
 * Madrat message box: Markdown preview while not editing (MUI-rendered, following
 * the MADASH theme in light and dark), click-to-edit, and `@` student mentions.
 * The message is shared server state, so each test restores what was there.
 */

const preview = (page: Page) => page.getByTestId("madrat-message-preview");
const editor = (page: Page) => page.locator("#madrat-message-box");

/** Click into edit mode; retried because a click before hydration is a no-op. */
async function startEditing(page: Page)
{
    await expect(async () =>
    {
        if (!(await editor(page).isVisible())) await preview(page).click();
        await expect(editor(page)).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
}

async function setMessage(page: Page, text: string)
{
    await startEditing(page);
    await editor(page).fill(text);
    // Blur → back to the rendered preview.
    await page.getByText("מצב העולם").click();
    await expect(preview(page)).toBeVisible();
}

test.describe("Madrat message box", () => {
    // First hit on a cold dev server compiles the page; the default 15s is too tight.
    test.setTimeout(60_000);
    let original = "";

    test.beforeEach(async ({ page }) => {
        await gotoAppHome(page);
        await expect(preview(page)).toBeVisible();
        const res = await page.request.get("/api/madrat");
        original = res.ok() ? ((await res.json()).data ?? "") : "";
    });

    test.afterEach(async ({ page }) => {
        await startEditing(page);
        await editor(page).fill(original);
        await page.getByText("מצב העולם").click();
    });

    test("renders Markdown when not editing, and the source while editing", async ({ page }) => {
        await setMessage(page, "# כותרת בדיקה\n\n**מודגש** ורשימה:\n\n- אחד\n- שניים\n\n`קוד`");

        await expect(preview(page).locator("h1")).toHaveText("כותרת בדיקה");
        await expect(preview(page).locator("strong")).toHaveText("מודגש");
        await expect(preview(page).locator("li")).toHaveCount(2);
        await expect(preview(page).locator("code")).toHaveText("קוד");
        await expect(preview(page)).not.toContainText("#");

        await startEditing(page);
        await expect(editor(page)).toBeFocused();
        await expect(editor(page)).toHaveValue(/^# כותרת בדיקה/);
    });

    test("preview follows the MADASH theme in light and dark mode", async ({ page }) => {
        await setMessage(page, "# כותרת\n\n> ציטוט");
        const colors = async () => preview(page).evaluate((el) => ({
            heading: getComputedStyle(el.querySelector("h1")!).color,
            quoteBorder: getComputedStyle(el.querySelector("blockquote")!).borderInlineStartColor,
            body: getComputedStyle(document.body).color,
        }));

        await page.emulateMedia({ colorScheme: "light" });
        await page.waitForTimeout(500);
        const light = await colors();
        await page.emulateMedia({ colorScheme: "dark" });
        await page.waitForTimeout(500);
        const dark = await colors();

        // Text uses the theme's text colour (same as the page body) in each mode…
        expect(light.heading).toBe(light.body);
        expect(dark.heading).toBe(dark.body);
        // …and actually switches with the mode.
        expect(light.heading).not.toBe(dark.heading);
        // Blockquote accent is the theme's secondary colour, not a browser default.
        expect(light.quoteBorder).not.toBe("rgb(0, 0, 0)");
    });

    test("`@` opens a student picker and the chosen name is highlighted in the preview", async ({ page }) => {
        await startEditing(page);
        await editor(page).fill("");
        await editor(page).pressSequentially("שלום @");

        const options = page.getByTestId("mention-options").getByRole("menuitem");
        await expect(options.first()).toBeVisible({ timeout: 15_000 });
        const name = (await options.first().locator(".MuiListItemText-primary").textContent())!.trim();

        await editor(page).press("Enter");
        await expect(page.getByTestId("mention-options")).toHaveCount(0);
        await expect(editor(page)).toHaveValue(`שלום ${name} `);

        await page.getByText("מצב העולם").click();
        const mention = preview(page).getByTestId("student-mention");
        await expect(mention).toHaveText(name);
        const bg = await mention.evaluate((e) => getComputedStyle(e).backgroundColor);
        expect(bg).not.toBe("rgba(0, 0, 0, 0)");

        // Hover shows the student's current room.
        await mention.hover();
        await expect(page.getByRole("tooltip")).toHaveText(/^(חדר: .+|לא משובץ לחדר)$/);
    });

    test("filters the picker by the typed query and Escape closes it", async ({ page }) => {
        await startEditing(page);
        await editor(page).fill("");
        await editor(page).pressSequentially("@");
        const options = page.getByTestId("mention-options").getByRole("menuitem");
        await expect(options.first()).toBeVisible({ timeout: 15_000 });
        const name = (await options.first().locator(".MuiListItemText-primary").textContent())!.trim();

        await editor(page).pressSequentially(name.slice(0, 3));
        for (const text of await options.locator(".MuiListItemText-primary").allTextContents())
            expect(text).toContain(name.slice(0, 3));

        await editor(page).press("Escape");
        await expect(page.getByTestId("mention-options")).toHaveCount(0);
    });
});
