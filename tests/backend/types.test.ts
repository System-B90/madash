import { describe, expect, it } from "vitest";
import { entityUid, CalledToHadasEntityType, ResolvableStudent, StudentToHadasData, GroupToHadasData } from "@/api-shared/types";
import dayjs from "dayjs";
import { createHash } from "crypto";

describe("entityUid utility", () => {
    const testDate = dayjs("2026-07-15T12:00:00.000Z");
    const reason = "בדיקת רופא";

    const studentA: ResolvableStudent = {
        name: "ישראל ישראלי",
        hiveId: 101,
        type: CalledToHadasEntityType.Student
    };

    const studentB: ResolvableStudent = {
        name: "משה כהן",
        hiveId: 102,
        type: CalledToHadasEntityType.Student
    };

    it("generates correct deterministic UID for a single student call", () => {
        const payload: Omit<StudentToHadasData, 'callId' | 'state'> = {
            type: CalledToHadasEntityType.Student,
            student: studentA,
            reason,
            expirationTime: testDate
        };

        const uid = entityUid(payload);

        const reasonHash = createHash('md5').update(reason).digest('hex');
        const expirationTimeHash = createHash('md5').update(testDate.toISOString()).digest('hex');
        const studentHash = createHash('md5').update("101").digest('hex');
        const expectedUid = `student-${reasonHash}-${expirationTimeHash}-${studentHash}`;

        expect(uid).toBe(expectedUid);
    });

    it("generates correct deterministic UID for a group call", () => {
        const payload: Omit<GroupToHadasData, 'callId' | 'state'> = {
            type: CalledToHadasEntityType.Group,
            students: [studentA, studentB],
            reason,
            expirationTime: testDate
        };

        const uid = entityUid(payload);

        const reasonHash = createHash('md5').update(reason).digest('hex');
        const expirationTimeHash = createHash('md5').update(testDate.toISOString()).digest('hex');
        
        // Group students are sorted by hiveId before hashing: "101,102"
        const studentsHash = createHash('md5').update("101,102").digest('hex');
        const expectedUid = `group-${reasonHash}-${expirationTimeHash}-${studentsHash}`;

        expect(uid).toBe(expectedUid);
    });

    it("is order-independent for the list of students in group calls", () => {
        const payload1: Omit<GroupToHadasData, 'callId' | 'state'> = {
            type: CalledToHadasEntityType.Group,
            students: [studentA, studentB],
            reason,
            expirationTime: testDate
        };

        const payload2: Omit<GroupToHadasData, 'callId' | 'state'> = {
            type: CalledToHadasEntityType.Group,
            students: [studentB, studentA],
            reason,
            expirationTime: testDate
        };

        expect(entityUid(payload1)).toBe(entityUid(payload2));
    });
});
