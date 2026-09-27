import { test, expect, gotoAppHome } from "./fixtures";
import { editor, mockRoster, preview, setMessage, startEditing } from "./madrat-helpers";

/**
 * Madrat message box: Markdown preview while not editing (MUI-rendered, following
 * the MADASH theme in light and dark), click-to-edit, and `@` student mentions.
 * The message is shared server state, so each test restores what was there.
 */

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
            quoteBorderWidth: getComputedStyle(el.querySelector("blockquote")!).borderInlineStartWidth,
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
        expect(light.quoteBorderWidth).toBe("3px");
        expect(light.quoteBorder).not.toBe("rgb(0, 0, 0)");
        expect(light.quoteBorder).not.toBe(dark.quoteBorder);
    });

    test("tags every kind: grouped picker, own colour/icon, and a kind-specific hover card", async ({ page }) => {
        await mockRoster(page);
        await gotoAppHome(page);
        await startEditing(page);
        await editor(page).fill("");

        // Picker: one section per kind, in order.
        await editor(page).pressSequentially("@");
        const menu = page.getByTestId("mention-options");
        await expect(menu.getByRole("menuitem").first()).toBeVisible({ timeout: 15_000 });
        await expect(menu.locator(".MuiListSubheader-root")).toHaveText([ "חניכים", "סגל", "בודקים", "חדרים", "קבוצות" ]);
        await expect(menu.locator("[data-kind=student]", { hasText: "טסטר תלמידה" })).toContainText("חדר מבחן 1, חדר מבחן 2");
        await editor(page).press("Escape");

        // Pick one of each kind by typing a query.
        for (const [ query, name ] of [ [ "טסטר תלמידה", "טסטר תלמידה" ], [ "מדריכת", "מדריכת טסט" ], [ "בודק ט", "בודק טסט" ], [ "חדר מבחן 1", "חדר מבחן 1" ], [ "צוות", "צוות בדיקה" ] ])
        {
            await editor(page).pressSequentially(` @${query}`);
            await expect(menu.getByRole("menuitem").first()).toContainText(name);
            await editor(page).press("Enter");
        }
        await expect(editor(page)).toHaveValue(/טסטר תלמידה .*מדריכת טסט .*בודק טסט .*חדר מבחן 1 .*צוות בדיקה $/);
        await page.getByText("מצב העולם").click();

        const mention = (kind: string) => preview(page).locator(`[data-testid=mention][data-kind=${kind}]`);
        // Per-kind locator: the previous card may still be fading out.
        let card = page.locator("[data-testid=mention-card]");
        const hover = async (kind: string) =>
        {
            await page.mouse.move(0, 0);
            await mention(kind).first().hover();
            card = page.locator(`[data-testid=mention-card][data-kind=${kind}]`);
            await expect(card).toBeVisible();
        };

        // Each kind has its own colour.
        const colors = new Set<string>();
        for (const kind of [ "student", "segel", "checker", "room", "group" ])
            colors.add(await mention(kind).first().evaluate((e) => getComputedStyle(e).color));
        expect(colors.size).toBe(5);

        await hover("student");
        await expect(card).toContainText("בשירותים");
        await expect(card).toContainText("חדרים (2)");
        await expect(card).toContainText("חדר מבחן 2");
        await expect(card).toContainText("מדריכת טסט"); // mentor

        await hover("room");
        await expect(card).toContainText("2 חניכים · 1 נוכחים");
        await expect(card.getByTestId("attendance-bar")).toBeVisible();
        await expect(card).toContainText("סגל בחדר");

        await hover("group");
        await expect(card).toContainText("פרוסים ב־2 חדרים");

        await hover("segel");
        await expect(card).toContainText("חניכים בחניכה (1)");

        await hover("checker");
        await expect(card).toContainText("לבדוק את תרגיל 3");
    });

    test("filters the picker by the typed query and Escape closes it", async ({ page }) => {
        await mockRoster(page);
        await gotoAppHome(page);
        await startEditing(page);
        await editor(page).fill("");
        await editor(page).pressSequentially("@חדר");
        const menu = page.getByTestId("mention-options");
        await expect(menu.getByRole("menuitem")).toHaveText([ /חדר מבחן 1/, /חדר מבחן 2/ ], { timeout: 15_000 });
        await expect(menu.locator(".MuiListSubheader-root")).toHaveText([ "חדרים" ]);

        await editor(page).press("Escape");
        await expect(menu).toHaveCount(0);
    });
});
