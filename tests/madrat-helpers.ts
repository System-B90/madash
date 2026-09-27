import type { Page } from "@playwright/test";

import { expect } from "./fixtures";

/** Shared by the madrat message spec and the release-screenshot generator. */

export const preview = (page: Page) => page.getByTestId("madrat-message-preview");
export const editor = (page: Page) => page.locator("#madrat-message-box");

const ok = (data: unknown) => ({ contentType: "application/json", body: JSON.stringify({ status: 0, data }) });

/** Fixed Hive roster so every tag kind (and its hover card) has predictable data. */
export async function mockRoster(page: Page)
{
    const at = "2026-09-27T08:15:00Z";
    await page.route("**/api/hive/students", (r) => r.fulfill(ok([
        { id: 901, display_name: "טסטר תלמידה", status: "Toilet", status_date: at, mentor: 950, clearance: 1, mentees: [] },
        { id: 902, display_name: "טסטר תלמיד", status: "Present", status_date: at, clearance: 1, mentees: [] },
    ])));
    await page.route("**/api/hive/classes", (r) => r.fulfill(ok([
        { id: 801, name: "חדר מבחן 1", type: "Room", users: [ 901, 902, 950 ] },
        { id: 802, name: "חדר מבחן 2", type: "Room", users: [ 901 ] },
        { id: 803, name: "צוות בדיקה", type: "Student Group", users: [ 901, 902 ] },
    ])));
    await page.route("**/api/hive/staff", (r) => r.fulfill(ok([
        { id: 950, name: "מדריכת טסט", clearance: 3, status: "Present", statusDate: at, mentees: [ 901 ], checkersBrief: "" },
        { id: 960, name: "בודק טסט", clearance: 2, status: "Work Talk", statusDate: at, mentees: [], checkersBrief: "לבדוק את תרגיל 3" },
    ])));
}

/** Click into edit mode; retried because a click before hydration is a no-op. */
export async function startEditing(page: Page)
{
    await expect(async () =>
    {
        if (!(await editor(page).isVisible())) await preview(page).click();
        await expect(editor(page)).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
}

export async function setMessage(page: Page, text: string)
{
    await startEditing(page);
    await editor(page).fill(text);
    // Blur → back to the rendered preview.
    await page.getByText("מצב העולם").click();
    await expect(preview(page)).toBeVisible();
}
