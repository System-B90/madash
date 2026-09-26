import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUsers = vi.fn();
vi.mock("@/api-server/hive/session-client", () => ({ default: vi.fn(async () => ({ getUsers })) }));

import { GET } from "@/app/api/status/hive/toilet-queue/route";

const request = () => new NextRequest("https://madash.test/api/status/hive/toilet-queue");

describe("GET /api/status/hive/toilet-queue", () => {
    afterEach(() => getUsers.mockReset());

    it("queries students only and returns waiting/out counts", async () => {
        getUsers.mockResolvedValue([
            { status: "Toilet Request" }, { status: "Toilet" }, { status: "Present" }, { status: "Toilet Request" },
        ]);
        const body = await (await GET(request())).json();
        expect(getUsers).toHaveBeenCalledWith({ clearance__in: "1" });
        expect(body).toEqual({ status: 0, data: { waiting: 2, out: 1 } });
    });

    it("reports a Hive failure as an API error instead of a count", async () => {
        getUsers.mockRejectedValue(new Error("hive down"));
        vi.spyOn(console, "log").mockImplementation(() => {});
        const body = await (await GET(request())).json();
        expect(body.status).toBe(-1);
    });
});
