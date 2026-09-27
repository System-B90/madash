import type { Page } from "@playwright/test";

import { test, expect, waitForAppLoad, SELECTORS } from "./fixtures";

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
    // Let data loads and polling tiles settle so the shot isn't a loading
    // skeleton. Bounded: a tile that never resolves still gets captured.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await expect(page.locator(".MuiSkeleton-root, [role='progressbar'], :text('בודק זמינות')"))
        .toHaveCount(0, { timeout: 30_000 })
        .catch(() => {});
    await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
}

test.describe("Release screenshots", () => {
    test.describe.configure({ timeout: 120_000 });

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
        await page.locator(SELECTORS.themeToggle).first().click();
        await expect(page.locator("html")).toHaveClass(/dark/);
        await shoot(page, "03-home-dark");
    });

    test("journal", async ({ page }) => {
        await openAuthed(page, "/journal");
        await shoot(page, "04-journal");
    });
});
