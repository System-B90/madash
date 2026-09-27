import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api-server/hive/session-client", () => ({ default: vi.fn() }));

import createHiveClient from "@/api-server/hive/session-client";
import { ClassTypeEnum, Clearance, StatusEnum } from "@/api-shared/hive-types";
import type { Class, CourseUser } from "@/api-shared/hive-types";
import { buildMentionDirectory, searchMentions, statusBreakdown, type StaffMember } from "@/api-shared/mentions";
import { GET as staffGET } from "@/app/api/hive/staff/route";

const student = (id: number, name: string, status: StatusEnum = StatusEnum.Present, mentor?: number) =>
    ({ id, display_name: name, status, status_date: "2026-09-27T08:15:00Z", mentor, clearance: Clearance.Hanich }) as unknown as CourseUser;
const cls = (id: number, name: string, type: ClassTypeEnum, users: number[]) =>
    ({ id, name, type, users }) as unknown as Class;
const staffer = (id: number, name: string, clearance: Clearance, extra: Partial<StaffMember> = {}): StaffMember =>
    ({ id, name, clearance, status: StatusEnum.Present, statusDate: "", mentees: [], checkersBrief: "", ...extra });

const data = () => ({
    students: [ student(1, "דנה כהן"), student(2, "יואב לוי", StatusEnum.Toilet), student(3, "נועה", StatusEnum.Home, 20) ],
    classes: [
        cls(10, "חדר 1", ClassTypeEnum.Room, [ 1, 2, 20 ]),
        cls(11, "חדר 2", ClassTypeEnum.Room, [ 1, 3 ]),
        cls(12, "צוות אלפא", ClassTypeEnum.Student_Group, [ 1, 2, 3 ]),
    ],
    staff: [
        staffer(20, "מיכל המדריכה", Clearance.Segel, { mentees: [ 1 ] }),
        staffer(21, "רון הבודק", Clearance.Checker, { checkersBrief: "לבדוק תרגיל 3" }),
        staffer(22, "אדמין", Clearance.Admin),
    ],
});

describe("buildMentionDirectory", () => {
    it("classifies every entity by kind", () => {
        const dir = buildMentionDirectory(data());
        const kinds = Object.fromEntries(dir.entities.map((e) => [ e.name, e.kind ]));
        expect(kinds).toMatchObject({
            "דנה כהן": "student", "חדר 1": "room", "צוות אלפא": "group",
            "מיכל המדריכה": "segel", "אדמין": "segel", "רון הבודק": "checker",
        });
    });

    it("keeps every room of a student in several rooms (not just the last)", () => {
        const dir = buildMentionDirectory(data());
        expect(dir.roomsOf(1).map((r) => r.name)).toEqual([ "חדר 1", "חדר 2" ]);
        expect(dir.groupsOf(1).map((g) => g.name)).toEqual([ "צוות אלפא" ]);
    });

    it("resolves mentors from both the student's mentor field and segel mentees", () => {
        const dir = buildMentionDirectory(data());
        expect(dir.mentorOf(1)?.name).toBe("מיכל המדריכה");
        expect(dir.mentorOf(3)?.name).toBe("מיכל המדריכה");
        expect(dir.mentorOf(2)).toBeUndefined();
    });

    it("splits class members into students and staff", () => {
        const { students, staff } = buildMentionDirectory(data()).membersOf(10);
        expect(students.map((p) => p.id)).toEqual([ 1, 2 ]);
        expect(staff.map((p) => p.id)).toEqual([ 20 ]);
    });

    it("dedupes a shared name, preferring students over rooms", () => {
        const d = data();
        d.classes.push(cls(13, "דנה כהן", ClassTypeEnum.Room, []));
        const dir = buildMentionDirectory(d);
        expect(dir.entities.filter((e) => e.name === "דנה כהן").map((e) => e.kind)).toEqual([ "student" ]);
    });

    it("does not auto-highlight one-letter names", () => {
        const d = data();
        d.classes.push(cls(14, "א", ClassTypeEnum.Student_Group, []));
        const dir = buildMentionDirectory(d);
        expect(dir.entities.some((e) => e.name === "א")).toBe(true);
        expect(dir.highlightable.some((e) => e.name === "א")).toBe(false);
    });
});

describe("searchMentions", () => {
    it("groups results by kind in picker order, prefix matches first", () => {
        const dir = buildMentionDirectory(data());
        expect(searchMentions(dir.entities, "").map((e) => e.kind)).toEqual(
            [ "student", "student", "student", "segel", "segel", "checker", "room", "room", "group" ]);
        expect(searchMentions(dir.entities, "חדר").map((e) => e.name)).toEqual([ "חדר 1", "חדר 2" ]);
        const names = searchMentions([ ...dir.entities, { key: "student:9", kind: "student", id: 9, name: "אבי דנה" } ], "דנה")
            .map((e) => e.name);
        expect(names).toEqual([ "דנה כהן", "אבי דנה" ]);
    });

    it("caps each kind", () => {
        const many = Array.from({ length: 9 }, (_, i) => ({ key: `room:${i}`, kind: "room" as const, id: i, name: `חדר ${i}` }));
        expect(searchMentions(many, "חדר", 5)).toHaveLength(5);
    });
});

describe("statusBreakdown", () => {
    it("counts statuses, most common first", () => {
        const dir = buildMentionDirectory(data());
        const people = [ 1, 2, 3, 20 ].map((id) => dir.person(id)!);
        expect(statusBreakdown(people)).toEqual([
            { status: StatusEnum.Present, count: 2 },
            { status: StatusEnum.Toilet, count: 1 },
            { status: StatusEnum.Home, count: 1 },
        ]);
    });
});

describe("GET /api/hive/staff", () => {
    beforeEach(() => vi.mocked(createHiveClient).mockReset());

    it("requests checkers, segel and admins, trimmed to the card fields", async () => {
        const getUsers = vi.fn().mockResolvedValue([ {
            id: 5, display_name: "מיכל", clearance: Clearance.Segel, status: StatusEnum.Present, status_date: "x",
            mentees: [ 1 ], checkers_brief: "", username: "secret-username", hostname: "pc-5",
        } ]);
        vi.mocked(createHiveClient).mockResolvedValue({ getUsers } as never);

        const res = await staffGET(new NextRequest("https://madash.test/api/hive/staff"));
        const body = await res.json();

        expect(getUsers).toHaveBeenCalledWith({ clearance__in: "2,3,5" });
        expect(body.data).toEqual([ {
            id: 5, name: "מיכל", clearance: Clearance.Segel, status: StatusEnum.Present, statusDate: "x", mentees: [ 1 ], checkersBrief: "",
        } ]);
    });

    it("maps a Hive failure to the error envelope", async () => {
        vi.mocked(createHiveClient).mockResolvedValue({ getUsers: vi.fn().mockRejectedValue(new Error("down")) } as never);
        const body = await (await staffGET(new NextRequest("https://madash.test/api/hive/staff"))).json();
        expect(body.status).not.toBe(0);
    });
});
