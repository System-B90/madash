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

// Skipped until #4 is fixed: after Hive SSO login in CI the dashboard never
// renders (no cards, and /api/status/services comes back empty), so every
// test here fails on its first assertion. Same gate as hadas/journal specs.
test.describe.skip("System status board", () => {
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

    test("collapsed board shows a compact up/down strip for all four services", async ({ page }) => {
        await mockServices(page, [
            { id: "bluz", state: "up", latencyMs: 87, checkedAt: Date.now(), history: [] },
            { id: "peekaboo", state: "down", reason: "unreachable", latencyMs: null, checkedAt: Date.now(), history: [] },
        ]);
        await gotoAppHome(page);
        const strip = page.getByTestId("status-strip");
        await expect(strip).toHaveCount(0);

        await page.getByText("מצב העולם").click();
        await expect(strip).toBeVisible();
        await expect(tile(page, "bluz")).toHaveCount(0);
        for (const id of TILE_IDS) await expect(page.getByTestId(`status-strip-${id}`)).toBeVisible();
        await expect(page.getByTestId("status-strip-peekaboo")).toHaveAttribute("data-state", "down");
        await expect(page.getByTestId("status-strip-bluz")).toHaveAttribute("data-state", "up");
        // Monitoring keeps running while collapsed (the Madash link settles to up on its own).
        await expect(page.getByTestId("status-strip-madash")).toHaveAttribute("data-state", "up", { timeout: 15_000 });

        await page.getByText("מצב העולם").click();
        await expect(strip).toHaveCount(0);
        await expect(tile(page, "peekaboo")).toHaveAttribute("data-state", "down");
    });

    test("Hive tile shows how many students are waiting to go to the toilet", async ({ page }) => {
        await page.route("**/api/status/hive/toilet-queue", (route) =>
            route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: 0, data: { waiting: 3, out: 1 } }) }));
        await gotoAppHome(page);
        const queue = tile(page, "hive").getByTestId("toilet-queue");
        await expect(queue).toHaveText("3");
        await expect(queue).toHaveAttribute("aria-label", /ממתינים לאישור יציאה לשירותים: 3 · בשירותים כעת: 1/);
    });

    test("toilet queue endpoint returns waiting/out counts from Hive", async ({ page }) => {
        await gotoAppHome(page);
        const body = await (await page.request.get("/api/status/hive/toilet-queue")).json();
        expect(body.status).toBe(0);
        expect(Number.isInteger(body.data.waiting) && body.data.waiting >= 0).toBe(true);
        expect(Number.isInteger(body.data.out) && body.data.out >= 0).toBe(true);
    });

    // Regression (#58): on regular HD screens the tiles wrapped their widgets onto a
    // second line and clipped their text; the layout was only tuned for ultrawide.
    for (const viewport of [ { width: 1366, height: 768 }, { width: 1600, height: 900 }, { width: 1920, height: 1080 } ])
    {
        test(`tiles lay out cleanly at ${viewport.width}x${viewport.height}`, async ({ page }) => {
            await page.setViewportSize(viewport);
            await mockServices(page, [
                { id: "bluz", state: "up", latencyMs: 106, checkedAt: Date.now(), history: history([ 100, 106, 98 ]) },
                { id: "peekaboo", state: "down", reason: "unreachable", latencyMs: null, checkedAt: Date.now(), history: history([ 40, null ]) },
            ]);
            await gotoAppHome(page);
            for (const id of TILE_IDS) await expect(tile(page, id)).toHaveAttribute("data-state", SETTLED_STATES, { timeout: 30_000 });

            const boxes = [];
            for (const id of TILE_IDS)
            {
                const problems = await tile(page, id).evaluate((el) =>
                {
                    const out: string[] = [];
                    const r = el.getBoundingClientRect();
                    if (el.scrollWidth > el.clientWidth + 1) out.push("tile overflows horizontally");
                    for (const child of el.querySelectorAll("*"))
                    {
                        const c = child.getBoundingClientRect();
                        if (c.width === 0 || c.height === 0) continue;
                        if (c.left < r.left - 1 || c.right > r.right + 1 || c.top < r.top - 1 || c.bottom > r.bottom + 1)
                            out.push(`child <${child.tagName.toLowerCase()}> spills out of the tile`);
                    }
                    // Text block and the widgets/glyph must share one line, not wrap under each other.
                    const text = el.firstElementChild!.getBoundingClientRect();
                    const side = el.lastElementChild!.getBoundingClientRect();
                    if (side.top >= text.bottom || text.top >= side.bottom) out.push("widgets wrapped onto their own line");
                    const label = el.querySelector(".MuiTypography-root") as HTMLElement;
                    if (label.scrollWidth > label.clientWidth + 1) out.push("service name is truncated");
                    return out;
                });
                expect(problems, id).toEqual([]);
                boxes.push((await tile(page, id).boundingBox())!);
            }

            // Balanced grid: every row fully used (4 or 2+2), never a lone orphan tile.
            const rows = new Set(boxes.map((b) => Math.round(b.y)));
            expect([ 1, 2 ]).toContain(rows.size);
            const widths = boxes.map((b) => b.width);
            expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(2);
            expect(Math.min(...widths)).toBeGreaterThanOrEqual(300);
        });
    }
});
