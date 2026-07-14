import { test as baseTest, expect as baseExpect, Locator, Page, BrowserContext } from "@playwright/test";

// Shared page and context for visual mode (single-window reuse)
let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

export const test = baseTest.extend({
    context: async ({ browser, contextOptions }, use) => {
        if (process.env.TEST_VISUAL === "1") {
            if (!sharedContext) {
                sharedContext = await browser.newContext(contextOptions);
            }
            await use(sharedContext);
        } else {
            const context = await browser.newContext(contextOptions);
            await use(context);
            await context.close();
        }
    },
    page: async ({ context }, use) => {
        if (process.env.TEST_VISUAL === "1") {
            if (!sharedPage) {
                sharedPage = await context.newPage();
            }
            await use(sharedPage);
        } else {
            const page = await context.newPage();
            await use(page);
            await page.close();
        }
    }
});

export const expect = baseExpect;

/**
 * Shared test fixtures and helper utilities for MADASH integration tests.
 */

// ─── Selectors ──────────────────────────────────────────────────────────────────

export const SELECTORS = {
    /** SideBar container */
    sideBar: ".MuiBox-root:has(.MuiAvatar-root), .MuiBox-root:has(button.MuiIconButton-root)",
    
    /** Collapsable Cards */
    callStudentToHadasCard: ".MuiPaper-root:has-text('קריאה לחד\"ס')",
    calledToHadasCard: ".MuiPaper-root:has-text('סטטוס קריאות')",
    
    /** MUI Autocomplete */
    autocomplete: ".MuiAutocomplete-root",
    
    /** Reason Input */
    reasonInput: "textarea[name='reason']",
    
    /** Send / Submit button */
    submitButton: "button[type='submit']",
    
    /** Checkbox for Group Call */
    groupCheckbox: "input[type='checkbox']",
    
    /** MUI Chip representing student call */
    studentChip: ".MuiChip-root",
    
    /** Theme toggle icon */
    themeToggle: "button:has(svg[data-testid='Brightness4Icon']), button:has(svg[data-testid='Brightness7Icon'])",
    
    /** Snackbar notification */
    snackbar: ".notistack-SnackbarContainer",
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Waits for the page to be fully loaded after navigation.
 */
export async function gotoAppHome(page: Page): Promise<void> {
    await page.goto("/", { waitUntil: "commit", timeout: 60_000 });
    await waitForAppLoad(page);
}

export async function waitForAppLoad(page: Page): Promise<void> {
    await page.waitForLoadState("domcontentloaded");
    // The sidebar user access bar or collapsable card serves as a signal the app is loaded
    await expect(page.locator(SELECTORS.calledToHadasCard).first()).toBeVisible({
        timeout: 60_000,
    });
}

/**
 * Generates a unique test identifier to avoid collisions between test runs.
 */
export function testId(prefix: string = "test"): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 6);
    return `${prefix}-${timestamp}-${random}`;
}
