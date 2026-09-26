import type { Page } from "@playwright/test";

import { test, expect, gotoAppHome } from "./fixtures";

/**
 * System status board ("מצב העולם"). Tiles expose `data-testid="service-tile-<id>"`
 * and `data-state` (loading | unconfigured | up | degraded | down), so these tests
 * don't depend on MUI class names or layout.
 */

const TILE_IDS = [ "madash", "hive", "bluz", "peekaboo" ] as const;
const SETTLED_STATES = /^(unconfigured|up|degraded|down)$/;

const tile = (page: Page, id: string) => page.getByTestId(`service-tile-${id}`);

/** Serve a fixed /api/status/services payload so UI assertions don't depend on which siblings are running. */
async function mockServices(page: Page, services: unknown[])
{
    await page.route("**/api/status/services", (route) =>
        route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: 0, data: services }) }));
}

const history = (latencies: Array<number | null>) =>
    latencies.map((latencyMs, i) => ({ at: Date.UTC(2026, 8, 26, 20, 0, i * 15), latencyMs }));

test.describe("System status board", () => {
    test("renders a tile with a service icon for every critical service", async ({ page }) => {
        await gotoAppHome(page);
        await expect(page.getByText("מצב העולם")).toBeVisible();

        for (const id of TILE_IDS)
        {
            const t = tile(page, id);
            await expect(t).toBeVisible();
            // Real logo (<img>) or the fallback mark (<svg>) — never an empty slot.
            await expect(t.locator("img, svg").first()).toBeVisible();
            await expect(t).toHaveAttribute("data-state", SETTLED_STATES, { timeout: 30_000 });
        }
    });

    // Regression: the session server stopped answering PING after the move to
    // @system-b90/session-ws, so this tile was permanently "down".
    test("Madash link reports up with a measured round-trip time", async ({ page }) => {
        await gotoAppHome(page);
        const madash = tile(page, "madash");
        await expect(madash).toHaveAttribute("data-state", "up", { timeout: 15_000 });
        await expect(madash).toContainText(/\d+(ms|\.\ds)/);
        // Still up after the 5s silence threshold → pongs are really arriving.
        await page.waitForTimeout(6_000);
        await expect(madash).toHaveAttribute("data-state", "up");
    });

    test("services endpoint returns one entry per monitored service", async ({ page }) => {
        await gotoAppHome(page);
        const res = await page.request.get("/api/status/services");
        const body = await res.json();
        expect(body.status).toBe(0);
        expect(body.data.map((s: { id: string; }) => s.id)).toEqual([ "bluz", "peekaboo" ]);
        for (const s of body.data)
        {
            expect(s.state).toMatch(SETTLED_STATES);
            expect(Array.isArray(s.history)).toBe(true);
        }
    });

    test("shows latency and a latency-over-time graph for a healthy service", async ({ page }) => {
        await mockServices(page, [
            { id: "bluz", state: "up", latencyMs: 87, checkedAt: Date.now(), checks: { mongodb: "up", postgres: "up", hive: "up" }, history: history([ 80, 95, 87 ]) },
            { id: "peekaboo", state: "up", latencyMs: 40, checkedAt: Date.now(), history: history([ 40, 41 ]) },
        ]);
        await gotoAppHome(page);

        const bluz = tile(page, "bluz");
        await expect(bluz).toHaveAttribute("data-state", "up");
        await expect(bluz).toContainText("87ms");
        await expect(bluz.getByTestId("latency-sparkline").locator("svg")).toBeVisible();
    });

    test("flags a down service and names a degraded dependency", async ({ page }) => {
        await mockServices(page, [
            { id: "bluz", state: "degraded", reason: "dependency", latencyMs: 120, checkedAt: Date.now(), checks: { mongodb: "up", postgres: "up", hive: "degraded" }, history: history([ 110, 120 ]) },
            { id: "peekaboo", state: "down", reason: "unreachable", latencyMs: null, checkedAt: Date.now(), history: history([ 40, null ]) },
        ]);
        await gotoAppHome(page);

        const pab = tile(page, "peekaboo");
        await expect(pab).toHaveAttribute("data-state", "down");
        await expect(pab).toContainText("לא זמין");
        await expect(pab).not.toContainText(/\d+ms/);
        // The down tint must actually differ from a healthy tile's background.
        const bluzBg = await tile(page, "bluz").evaluate((e) => getComputedStyle(e).backgroundColor);
        const pabBg = await pab.evaluate((e) => getComputedStyle(e).backgroundColor);
        expect(pabBg).not.toBe(bluzBg);

        const bluz = tile(page, "bluz");
        await expect(bluz).toHaveAttribute("data-state", "degraded");
        await expect(bluz).toContainText("תקלה ב־הייב");
    });

    test("shows every sibling as down when the status endpoint itself fails", async ({ page }) => {
        await page.route("**/api/status/services", (route) => route.abort());
        await gotoAppHome(page);
        await expect(tile(page, "bluz")).toHaveAttribute("data-state", "down");
        await expect(tile(page, "peekaboo")).toHaveAttribute("data-state", "down");
    });

    test("contains the open helps gauge in the Hive tile", async ({ page }) => {
        await gotoAppHome(page);
        await expect(tile(page, "hive")).toContainText("הלפים");
    });
});
