import { test, expect } from "./fixtures";

/**
 * Login page E2E tests — run WITHOUT auth state to verify the unauthenticated flow.
 * These tests use a separate project context that skips the auth setup.
 */

test.describe("Login Page", () => {
    test("redirects unauthenticated root access to login", async ({ page }) => {
        await page.goto("/", { waitUntil: "commit" });

        // Should redirect to /login
        await expect(page).toHaveURL(/\/login/);
    });

    test("renders the login page with welcome header and subtitle", async ({
        page,
    }) => {
        await page.goto("/login", { waitUntil: "commit" });

        // Verify the main heading
        await expect(page.getByText("ברוכים הבאים למדש")).toBeVisible();

        // Verify the subtitle
        await expect(page.getByText("מה חדש?")).toBeVisible();
    });

    test("displays the Hive SSO login button", async ({ page }) => {
        await page.goto("/login", { waitUntil: "commit" });

        // The LoginWithHive component renders a sign-in button
        const loginButton = page.locator("button, a").filter({
            hasText: /hive|התחבר|כניסה/i,
        });
        await expect(loginButton.first()).toBeVisible();
        await expect(loginButton.first()).toHaveText("התחברות עם הייב");
    });

    // Skipped: the login page doesn't read the `error` query param or render any
    // error banner yet — https://github.com/System-B15/madash/issues/5.
    test.skip("shows error alert for AccessDenied", async ({ page }) => {
        // NextAuth forwards errors in the query params: /login?error=AccessDenied
        await page.goto("/login?error=AccessDenied", { waitUntil: "commit" });

        // Verify error alert renders (MADASH error container or alert component)
        await expect(page.getByText(/התחברות נכשלה|שגיאה|אישור/i).first()).toBeVisible();
    });

    // Skipped: same as above — https://github.com/System-B15/madash/issues/5.
    test.skip("shows error alert for OAuthCallback", async ({ page }) => {
        await page.goto("/login?error=OAuthCallback", { waitUntil: "commit" });
        await expect(page.getByText(/התחברות נכשלה|שגיאה|אישור/i).first()).toBeVisible();
    });
});
