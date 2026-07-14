import { describe, expect, it, vi, beforeEach } from "vitest";
import {
    getMadratText,
    modifyMadratText,
    getCallsToHadas,
    addStudentCallToHadas,
    addGroupCallToHadas,
    removeCallToHadas,
    updateCallToHadasState
} from "@/api-server/datastore";
import { CalledToHadasEntityType, ResolvableStudent } from "@/api-shared/types";
import { CallToHadasError } from "@/api-shared/errors";
import { MessageTypes } from "@/settings";
import dayjs from "dayjs";

// Mock the WebSocket broadcast utility to avoid ReferenceError on WebSocket and keep tests hermetic
vi.mock("@/api-server/web-socket-utils", () => {
    return {
        SendServerRequestToSessionServer: vi.fn().mockResolvedValue(undefined)
    };
});

import { SendServerRequestToSessionServer } from "@/api-server/web-socket-utils";

describe("in-memory datastore", () => {
    const student1: ResolvableStudent = {
        name: "יוסי לוי",
        hiveId: 201,
        type: CalledToHadasEntityType.Student
    };

    const student2: ResolvableStudent = {
        name: "דני כהן",
        hiveId: 202,
        type: CalledToHadasEntityType.Student
    };

    const expirationTime = dayjs().add(2, "hour");
    const reason = "סוגר פינה";

    beforeEach(() => {
        vi.clearAllMocks();
        // Note: data is not exported, but we can clean up calls by retrieving and removing them
        getCallsToHadas().then(calls => {
            Object.keys(calls).forEach(id => {
                try {
                    removeCallToHadas(id);
                } catch {
                    // Ignore already deleted
                }
            });
        });
    });

    it("gets and modifies madrat text", async () => {
        const text = "הודעת מדריגול";
        await modifyMadratText(text);

        const currentText = await getMadratText();
        expect(currentText).toBe(text);
        expect(SendServerRequestToSessionServer).toHaveBeenCalledWith({
            type: MessageTypes.MADRAT_TEXT_UPDATE,
            data: text
        });
    });

    it("adds a single student call to Hadas", async () => {
        const callId = addStudentCallToHadas(student1, reason, expirationTime);
        expect(callId).toBeDefined();

        const calls = await getCallsToHadas();
        expect(calls[callId]).toBeDefined();
        expect(calls[callId].reason).toBe(reason);
        expect(calls[callId].state).toBe("requested");
        expect(calls[callId].type).toBe(CalledToHadasEntityType.Student);

        expect(SendServerRequestToSessionServer).toHaveBeenCalledWith({
            type: MessageTypes.STUDENTS_TO_HADAS_UPDATE
        });
    });

    it("prevents duplicate student calls to Hadas", () => {
        addStudentCallToHadas(student1, reason, expirationTime);
        expect(() => {
            addStudentCallToHadas(student1, reason, expirationTime);
        }).toThrow(CallToHadasError);
    });

    it("adds a group call to Hadas", async () => {
        const callId = addGroupCallToHadas([student1, student2], reason, expirationTime);
        expect(callId).toBeDefined();

        const calls = await getCallsToHadas();
        expect(calls[callId]).toBeDefined();
        expect(calls[callId].type).toBe(CalledToHadasEntityType.Group);
        
        const groupCall = calls[callId] as any;
        expect(groupCall.students).toHaveLength(2);
        expect(groupCall.students[0].hiveId).toBe(201);
    });

    it("prevents duplicate group calls to Hadas", () => {
        addGroupCallToHadas([student1, student2], reason, expirationTime);
        expect(() => {
            addGroupCallToHadas([student1, student2], reason, expirationTime);
        }).toThrow(CallToHadasError);
    });

    it("updates call state (requested -> told)", async () => {
        const callId = addStudentCallToHadas(student1, reason, expirationTime);
        const updated = updateCallToHadasState(callId, "told");
        expect(updated.state).toBe("told");

        const calls = await getCallsToHadas();
        expect(calls[callId].state).toBe("told");
    });

    it("throws CallToHadasError when updating non-existent call", () => {
        expect(() => {
            updateCallToHadasState("non-existent-id", "told");
        }).toThrow(CallToHadasError);
    });

    it("removes a call", async () => {
        const callId = addStudentCallToHadas(student1, reason, expirationTime);
        const removed = removeCallToHadas(callId);
        expect(removed.callId).toBe(callId);

        const calls = await getCallsToHadas();
        expect(calls[callId]).toBeUndefined();
    });

    it("throws CallToHadasError when removing non-existent call", () => {
        expect(() => {
            removeCallToHadas("non-existent-id");
        }).toThrow(CallToHadasError);
    });
});
