import { withLabelOverrides } from "@system-b90/command-palette";
import { HE_LABELS } from "@system-b90/command-palette/he";

/**
 * Madash's palette wording.
 *
 * Starts from the package's Hebrew table and overrides only what Madash says
 * differently — mostly a placeholder naming the things this app actually holds.
 * Importing `/he` and never `/en` is what keeps the English strings out of the
 * bundle.
 */
export const PALETTE_LABELS = withLabelOverrides(HE_LABELS, {
    placeholder: "הקלידו פקודה, או חפשו חניך…",
    empty: "לא נמצאו תוצאות",
    recents: "בשימוש לאחרונה",
    kinds: {
        entity: "חניכים",
        goto: "ניווט",
    },
    hints: {
        run: "ביצוע",
    },
});

/**
 * Section headings. Centralised so two contributors never disagree on the
 * spelling of a group and split it into two sections in the result list.
 */
export const COMMAND_GROUPS = {
    navigation: "ניווט",
    hadas: "קריאה להדס",
    appearance: "תצוגה",
    session: "משתמש",
} as const;
