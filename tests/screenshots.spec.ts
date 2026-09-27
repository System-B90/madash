import type { Page } from "@playwright/test";

import { test, expect, waitForAppLoad, SELECTORS } from "./fixtures";
import { editor, mockRoster, preview, startEditing } from "./madrat-helpers";

/**
 * Release screenshots. Captures the main screens into `release-screenshots/`,
 * which e2e.yml uploads as an artifact on every run and attaches to the GitHub
 * Release on `v*` tags. Keep the list in step with the app's user-facing pages
 * (see CLAUDE.md, "Release screenshots").
 *
 * The only assertion is that the page was actually served: a 5xx (e.g. an
 * nginx 502 page) fails the test instead of shipping as a "screenshot".
 */

const OUT_DIR = "release-screenshots";

/** Navigates, retrying 5xx responses for up to ~30s while the stack warms up. */
async function open(page: Page, url: string): Promise<void>
{
    let status = 0;
    for (let attempt = 0; attempt < 10; attempt++)
    {
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        status = res?.status() ?? 0;
        if (status > 0 && status < 500)
        {
            break;
        }
        await page.waitForTimeout(3_000);
    }
    expect(status, `${url} was not served (HTTP ${status})`).toBeLessThan(500);
    await waitForAppLoad(page);
}

/** Logged-in screens: a redirect to /login means the SSO auth state is missing. */
async function openAuthed(page: Page, url: string): Promise<void>
{
    await open(page, url);
    await expect(page, `${url} redirected to login (auth state missing)`).not.toHaveURL(/\/login/);
}

async function shoot(page: Page, name: string): Promise<void>
{
    // Let polling tiles and fonts settle so the shot isn't a loading skeleton.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
}

test.describe("Release screenshots", () => {
    test.describe.configure({ timeout: 90_000 });

    test("login", async ({ browser }) => {
        const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
        const page = await context.newPage();
        await open(page, "/login");
        await shoot(page, "01-login");
        await context.close();
    });

    test("home", async ({ page }) => {
        await openAuthed(page, "/");
        await shoot(page, "02-home");
    });

    test("home (dark)", async ({ page }) => {
        await openAuthed(page, "/");
        const toggle = page.locator(SELECTORS.themeToggle).first();
        if (await toggle.isVisible())
        {
            await toggle.click();
        }
        await shoot(page, "03-home-dark");
    });

    test("journal", async ({ page }) => {
        await openAuthed(page, "/journal");
        await shoot(page, "04-journal");
    });

    // #58: the board must lay out cleanly on a regular HD screen, not only ultrawide.
    test("status board at 1366x768", async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });
        await openAuthed(page, "/");
        const board = page.locator(".MuiPaper-root", { has: page.getByTestId("service-tile-madash") });
        await expect(board).toBeVisible();
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        await board.screenshot({ path: `${OUT_DIR}/05-status-board-1366.png` });
    });

    // Madrat message: Markdown preview with @ mentions, and a mention's hover card.
    // Mock roster, so the shots never carry real student names.
    test("madrat message with mentions", async ({ page }) => {
        await mockRoster(page);
        await openAuthed(page, "/");
        const original = await (await page.request.get("/api/madrat")).json().then((b) => b.data ?? "").catch(() => "");
        try
        {
            await startEditing(page);
            await editor(page).fill([
                "## הודעות להיום",
                "",
                "- **08:30** — מסדר בוקר, צוות בדיקה מתייצב בחדר מבחן 1",
                "- טסטר תלמידה לעדכן את מדריכת טסט לפני ההפסקה",
                "- בודק טסט עובר על תרגיל 3 אחרי הצהריים",
            ].join("\n"));
            await page.getByText("מצב העולם").click();
            await expect(preview(page).getByTestId("mention").first()).toBeVisible();
            // Crop to the rendered text, and keep the Next.js dev badge out of it.
            await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
            const box = (await preview(page).boundingBox())!;
            const content = (await preview(page).locator("> div").first().boundingBox())!;
            await page.screenshot({
                path: `${OUT_DIR}/06-madrat-mentions.png`,
                clip: { x: box.x, y: box.y, width: box.width, height: content.y + content.height + 20 - box.y },
            });

            await preview(page).locator("[data-testid=mention][data-kind=room]").first().hover();
            const card = page.locator("[data-testid=mention-card][data-kind=room]");
            await expect(card).toBeVisible();
            await page.locator(".MuiTooltip-tooltip", { has: card }).screenshot({ path: `${OUT_DIR}/07-mention-card-room.png` });
        }
        finally
        {
            await page.request.post("/api/madrat", { data: original, headers: { "content-type": "text/plain" } });
        }
    });
});
