import { fireEvent, render, screen } from "@testing-library/react";
import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";

import DateNavigator from "@/components/journal/DateNavigator";

/**
 * Regression for madash#6: the e2e suite located the day buttons by their
 * icons' data-testid, which MUI strips from production builds, so the
 * navigator looked unrendered. The buttons need accessible names.
 */
describe("DateNavigator", () => {
    const day = dayjs("2026-10-03");

    it.each([
        [ "יום קודם", "2026-10-02" ],
        [ "יום הבא", "2026-10-04" ],
    ])("has a labelled %s button that moves one day", (label, expected) => {
        const onDateChange = vi.fn();
        render(<DateNavigator selectedDate={day} onDateChange={onDateChange} />);

        fireEvent.click(screen.getByRole("button", { name: label }));

        expect(onDateChange.mock.calls[0][0].format("YYYY-MM-DD")).toBe(expected);
    });
});
