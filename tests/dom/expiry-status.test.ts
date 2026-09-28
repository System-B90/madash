import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { getExpiryStatus } from "@/components/call-student-to-hadas";

/** The call-to-hadas expiry chip at the past/future boundary (madash#33). */

const NOW = dayjs("2026-09-28T10:00:00");

describe("getExpiryStatus", () => {
    it("shows nothing without a time", () => {
        expect(getExpiryStatus(null, NOW)).toBeNull();
    });

    it.each([
        [ "in the past", NOW.subtract(5, "minute") ],
        [ "exactly now", NOW ],
        [ "under a minute ahead", NOW.add(59, "second") ],
    ])("is expired %s", (_label, time) => {
        expect(getExpiryStatus(time, NOW)).toEqual({ label: "פג תוקף", color: "error" });
    });

    it("counts down from a full minute ahead", () => {
        const status = getExpiryStatus(NOW.add(1, "minute"), NOW);
        expect(status?.color).toBe("info");
        expect(status?.label.startsWith("בעוד ")).toBe(true);
    });

    it("describes the time left", () => {
        expect(getExpiryStatus(NOW.add(2, "hour"), NOW)?.label).toBe(
            `בעוד ${NOW.add(2, "hour").from(NOW, true)}`,
        );
    });
});
