import { describe, expect, it } from "vitest";

import {
    ANCHORS,
    HOME_HELP_TOPICS,
    JOURNAL_HELP_TOPICS,
    TOURS,
} from "@/components/onboarding/tours";

import { TOUR_IDS } from "../fixtures";

/** Tour definitions (#77): steps point at real anchors, topics at real tours. */
describe("onboarding tours", () => {
    const anchorIds = new Set<string>(Object.values(ANCHORS));

    it("only anchors steps on ids some component registers", () => {
        for (const tour of TOURS)
            for (const step of tour.steps)
                if (step.anchor) expect(anchorIds, `${tour.id}/${step.id}`).toContain(step.anchor);
    });

    it("has unique tour and step ids", () => {
        expect(new Set(TOURS.map((t) => t.id)).size).toBe(TOURS.length);
        for (const tour of TOURS)
            expect(new Set(tour.steps.map((s) => s.id)).size).toBe(tour.steps.length);
    });

    it("replays only tours that exist", () => {
        const tourIds = new Set(TOURS.map((t) => t.id));
        for (const topic of [ ...HOME_HELP_TOPICS, ...JOURNAL_HELP_TOPICS ])
            if (topic.tourId) expect(tourIds).toContain(topic.tourId);
    });

    it("is what the e2e fixture marks as seen", () => {
        expect([ ...TOUR_IDS ].sort()).toEqual(TOURS.map((t) => t.id).sort());
    });
});
