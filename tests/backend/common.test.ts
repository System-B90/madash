import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ApiResponseMaker, catchHandler } from "@/api-server/common";
import { ClientApiError, UserNotLoggedInError } from "@/api-shared/errors";
import { IMMUTABLE_CACHE_MAX_TTL } from "@/settings";

describe("catchHandler", () => {
    const request = new NextRequest("https://madash.test/api/whatever");

    it("returns an error response for UserNotLoggedInError", () => {
        const response = catchHandler(request, new UserNotLoggedInError("not logged in"));
        expect(response.ok).toBe(false);
    });

    it("wraps ClientApiError via ApiErrorMaker", async () => {
        const response = catchHandler(request, new ClientApiError("bad request"));
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe(-1);
        expect(body.error.name).toBe("ClientApiError");
    });

    it("falls back to a generic ApiError for unknown errors", async () => {
        const response = catchHandler(request, new Error("boom"));
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe(-1);
    });
});

describe("ApiResponseMaker", () => {
    it("sets an immutable Cache-Control header", () => {
        const response = ApiResponseMaker({ ok: true }, "immutable");
        expect(response.headers.get("Cache-Control")).toBe(`public, max-age=${IMMUTABLE_CACHE_MAX_TTL}, immutable`);
    });

    it("sets a must-revalidate Cache-Control header", () => {
        const response = ApiResponseMaker({ ok: true }, "must-revalidate");
        expect(response.headers.get("Cache-Control")).toBe("public, max-age=1, must-revalidate");
    });

    it("sets a numeric TTL Cache-Control header", () => {
        const response = ApiResponseMaker({ ok: true }, 42);
        expect(response.headers.get("Cache-Control")).toBe("public, max-age=42, immutable");
    });

    it("asserts when a Cache-Control header is already present in init", () => {
        expect(() => {
            ApiResponseMaker({ ok: true }, "immutable", { headers: { "Cache-Control": "no-store" } });
        }).toThrow();
    });

    it("returns a 200 with the wrapped data when no cacheControl is given", async () => {
        const response = ApiResponseMaker({ hello: "world" });
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toEqual({ status: 0, data: { hello: "world" } });
    });
});
