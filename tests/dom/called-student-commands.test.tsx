import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";

import { CalledToHadasEntityType, StudentToHadasData } from "@/api-shared/types";
import {
    buildCalledStudentCommands,
    CANCEL_CALL,
    MARK_TOLD,
} from "@/components/app-commands/CalledStudentCommands";

/** Palette commands for open calls to Hadas (madash#53). */

function call(callId: string, name: string, state: StudentToHadasData["state"]): StudentToHadasData {
    return {
        callId,
        reason: "",
        expirationTime: dayjs(),
        state,
        type: CalledToHadasEntityType.Student,
        student: { name, hiveId: 1, type: CalledToHadasEntityType.Student } as never,
    };
}

describe("buildCalledStudentCommands", () => {
    it("offers mark-told and cancel for a requested call, cancel only once told", () => {
        const commands = buildCalledStudentCommands(
            [ call("a", "דנה", "requested"), call("b", "יוסי", "told") ],
            { markTold: vi.fn(), cancel: vi.fn() },
        );
        expect(commands.map((c) => c.title)).toEqual([
            `${MARK_TOLD}: דנה`,
            `${CANCEL_CALL}: דנה`,
            `${CANCEL_CALL}: יוסי`,
        ]);
    });

    it("is searchable by student name and by action", () => {
        const [ told ] = buildCalledStudentCommands([ call("a", "דנה", "requested") ], {
            markTold: vi.fn(),
            cancel: vi.fn(),
        });
        expect(told.keywords).toEqual(expect.arrayContaining([ "דנה", MARK_TOLD ]));
    });

    it("runs the matching action for the call", () => {
        const actions = { markTold: vi.fn(), cancel: vi.fn() };
        const target = call("a", "דנה", "requested");
        const [ told, cancel ] = buildCalledStudentCommands([ target ], actions);

        told.run?.();
        cancel.run?.();

        expect(actions.markTold).toHaveBeenCalledWith(target);
        expect(actions.cancel).toHaveBeenCalledWith(target);
    });
});
