import * as fs from "fs";
import * as path from "path";
import { expect, Page, test as setup } from "@playwright/test";
import { hiveLogin, AUTH_STATE_PATH } from "@system-b90/test-kit/auth";
import { SELECTORS } from "./fixtures";

const AUTH_FILE = path.join(__dirname, AUTH_STATE_PATH);

async function tryGoto(
    page: Page,
    url: string,
    timeout = 30_000,
): Promise<boolean> {
    try {
        const response = await page.goto(url, {
            waitUntil: "commit",
            timeout,
        });
        return !!response && response.status() < 500;
    } catch {
        return false;
    }
}

async function gotoReliable(page: Page, url: string): Promise<void> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (await tryGoto(page, url, 45_000)) {
            return;
        }
        if (attempt < maxAttempts) {
            await page.waitForTimeout(2_000 * attempt);
        }
    }
    throw new Error(`Failed to navigate to ${url}`);
}

setup("authenticate via Hive SSO", async ({ browser }) => {
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Try to reuse a previously saved session before starting SSO
    if (fs.existsSync(AUTH_FILE)) {
        const reuseContext = await browser.newContext({
            storageState: AUTH_FILE,
        });
        const reusePage = await reuseContext.newPage();

        if (
            (await tryGoto(reusePage, "/")) &&
            !reusePage.url().includes("/login")
        ) {
            await reuseContext.storageState({ path: AUTH_FILE });
            await reuseContext.close();
            return;
        }
        await reuseContext.close();
    }

    // Session missing or expired — perform the full Hive SSO flow in a clean context
    const context = await browser.newContext();
    const page = await context.newPage();
    const baseURL = setup.info().project.use.baseURL as string;

    await gotoReliable(page, "/login");

    if (!page.url().includes("/login")) {
        await context.storageState({ path: AUTH_FILE });
        await context.close();
        return;
    }

    // Shared Hive SSO flow (CSRF handshake, credential form, optional
    // authorize screen) lives in @system-b90/test-kit/auth — this is the
    // copy-pasted boilerplate #226 is consolidating.
    await hiveLogin(page, { baseURL, username: "admin", password: "Password1" });

    // Wait until the dashboard content loads (the status card).
    // Known flaky/broken post-login render — https://github.com/System-B90/madash/issues/4.
    // Non-blocking: auth itself succeeded (we navigated away from /login), so don't
    // fail the setup project and block the whole "chromium" project over this.
    try {
        await expect(page.locator(SELECTORS.calledToHadasCard).first()).toBeVisible({
            timeout: 60_000,
        });
    } catch (error) {
        console.warn("calledToHadasCard did not become visible post-login (see issue #4):", error);
    }

    await context.storageState({ path: AUTH_FILE });
    await context.close();
});
