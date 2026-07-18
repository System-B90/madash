import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { studentsReducer, StudentsState, StudentsAction } from "@/components/students-provider";
import { calledEntitiesReducer, CalledEntitiesState, CalledEntitiesAction } from "@/components/called-students-provider";
import { CalledToHadasEntityType } from "@/api-shared/types";
import type { Class, CourseUser } from "@/api-shared/hive-types";

describe("studentsReducer", () => {
    const initialState: StudentsState = {
        rawStudents: [],
        classes: [],
        isClassesLoading: true,
        isStudentsLoading: true,
    };

    it("SET_RAW_STUDENTS stores the students and clears the loading flag", () => {
        // Minimal fixture: only reference identity is asserted, not field shape.
        const rawStudents = [ { id: 1 } as unknown as CourseUser ];
        const next = studentsReducer(initialState, { type: 'SET_RAW_STUDENTS', payload: rawStudents });
        expect(next.rawStudents).toBe(rawStudents);
        expect(next.isStudentsLoading).toBe(false);
    });

    it("SET_CLASSES stores the classes and clears the loading flag", () => {
        // Minimal fixture: only reference identity is asserted, not field shape.
        const classes = [ { id: 1 } as unknown as Class ];
        const next = studentsReducer(initialState, { type: 'SET_CLASSES', payload: classes });
        expect(next.classes).toBe(classes);
        expect(next.isClassesLoading).toBe(false);
    });

    it("SET_CLASSES_LOADING toggles only the classes loading flag", () => {
        const next = studentsReducer(initialState, { type: 'SET_CLASSES_LOADING', payload: false });
        expect(next.isClassesLoading).toBe(false);
        expect(next.isStudentsLoading).toBe(true);
    });

    it("START_REFRESH sets both loading flags", () => {
        const settled: StudentsState = { ...initialState, isClassesLoading: false, isStudentsLoading: false };
        const next = studentsReducer(settled, { type: 'START_REFRESH' });
        expect(next.isClassesLoading).toBe(true);
        expect(next.isStudentsLoading).toBe(true);
    });

    it("ignores unknown actions", () => {
        // Deliberately invalid discriminant to exercise the reducer's default branch.
        const next = studentsReducer(initialState, { type: 'UNKNOWN' } as unknown as StudentsAction);
        expect(next).toBe(initialState);
    });
});

describe("calledEntitiesReducer", () => {
    const initialState: CalledEntitiesState = { entitiesData: {}, isLoading: true };

    it("SET_ENTITIES stores the data and clears the loading flag", () => {
        const entitiesData: CalledEntitiesState[ 'entitiesData' ] = {
            "call-1": {
                callId: "call-1",
                reason: "test",
                expirationTime: dayjs(),
                state: 'requested',
                type: CalledToHadasEntityType.Student,
                student: { name: "Test Student", hiveId: 1, type: CalledToHadasEntityType.Student },
            },
        };

        const next = calledEntitiesReducer(initialState, { type: 'SET_ENTITIES', payload: entitiesData });
        expect(next.entitiesData).toBe(entitiesData);
        expect(next.isLoading).toBe(false);
    });

    it("SET_LOADING toggles the loading flag", () => {
        const next = calledEntitiesReducer({ ...initialState, isLoading: false }, { type: 'SET_LOADING', payload: true });
        expect(next.isLoading).toBe(true);
    });

    it("ignores unknown actions", () => {
        // Deliberately invalid discriminant to exercise the reducer's default branch.
        const next = calledEntitiesReducer(initialState, { type: 'UNKNOWN' } as unknown as CalledEntitiesAction);
        expect(next).toBe(initialState);
    });
});
