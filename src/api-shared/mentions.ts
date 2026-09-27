/*
 * Taggable entities for the madrat message (`@` mentions): students, rooms, student
 * groups, segel and checkers. Pure — the directory is built from Hive data the
 * client already holds, and powers the picker, the highlighting and the hover cards.
 */
import { ClassTypeEnum, Clearance, StatusEnum } from "@/api-shared/hive-types";
import type { Class, CourseUser } from "@/api-shared/hive-types";

/** A staff user (segel/admin/checker), trimmed server-side to what the UI shows. */
export interface StaffMember
{
    id: number;
    name: string;
    clearance: Clearance;
    status: StatusEnum;
    statusDate: string;
    mentees: number[];
    checkersBrief: string;
}

export type MentionKind = "student" | "segel" | "checker" | "room" | "group";

/** Picker section order, and which kind wins when two entities share a name. */
export const MENTION_KINDS: readonly MentionKind[] = [ "student", "segel", "checker", "room", "group" ];

export const MENTION_KIND_LABELS: Record<MentionKind, string> = {
    student: "חניכים",
    segel: "סגל",
    checker: "בודקים",
    room: "חדרים",
    group: "קבוצות",
};

/** Shorter names would highlight ordinary words. */
const MIN_HIGHLIGHT_LENGTH = 2;

export interface MentionEntity
{
    /** `${kind}:${id}` — unique across kinds. */
    key: string;
    kind: MentionKind;
    id: number;
    name: string;
}

export interface Person
{
    id: number;
    name: string;
    kind: "student" | "segel" | "checker";
    status: StatusEnum;
    statusDate: string;
}

export const STATUS_LABELS: Record<StatusEnum, string> = {
    [ StatusEnum.Present ]: "נוכח/ת",
    [ StatusEnum.Raised_Hand ]: "מצביע/ה",
    [ StatusEnum.Toilet_Request ]: "מבקש/ת לצאת לשירותים",
    [ StatusEnum.Toilet ]: "בשירותים",
    [ StatusEnum.Personal_Talk ]: "בשיחה אישית",
    [ StatusEnum.Work_Talk ]: "בשיחת עבודה",
    [ StatusEnum.Medical ]: "בטיפול רפואי",
    [ StatusEnum.Prayer ]: "בתפילה",
    [ StatusEnum.Room ]: "בחדר",
    [ StatusEnum.Home ]: "בבית",
};

/** Statuses that mean "physically here and available". */
const PRESENT_STATUSES: ReadonlySet<StatusEnum> = new Set([ StatusEnum.Present, StatusEnum.Raised_Hand, StatusEnum.Room ]);
export const isPresent = (status: StatusEnum) => PRESENT_STATUSES.has(status);

export const staffKind = (clearance: Clearance): "segel" | "checker" =>
    clearance === Clearance.Checker ? "checker" : "segel";

export const mentionKey = (kind: MentionKind, id: number) => `${kind}:${id}`;

export interface MentionDirectory
{
    /** Deduplicated by name (see MENTION_KINDS priority), sorted by kind then name. */
    entities: MentionEntity[];
    byKey: ReadonlyMap<string, MentionEntity>;
    /** Entities long enough to auto-highlight in rendered text. */
    highlightable: MentionEntity[];
    person: (id: number) => Person | undefined;
    staff: (id: number) => StaffMember | undefined;
    classById: (id: number) => Class | undefined;
    /** Rooms / student groups a user belongs to (all of them, not just one). */
    roomsOf: (userId: number) => Class[];
    groupsOf: (userId: number) => Class[];
    /** Mentor (segel) of a student, if known. */
    mentorOf: (studentId: number) => Person | undefined;
    /** Members of a class split by kind. */
    membersOf: (classId: number) => { students: Person[]; staff: Person[]; };
}

export function statusBreakdown(people: Person[]): Array<{ status: StatusEnum; count: number; }>
{
    const counts = new Map<StatusEnum, number>();
    for (const p of people) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
    return [ ...counts ].map(([ status, count ]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

export function buildMentionDirectory({ students, classes, staff }: {
    students: CourseUser[];
    classes: Class[];
    staff: StaffMember[];
}): MentionDirectory
{
    const people = new Map<number, Person>();
    for (const s of students)
        people.set(s.id, { id: s.id, name: s.display_name, kind: "student", status: s.status, statusDate: s.status_date });
    for (const m of staff)
        people.set(m.id, { id: m.id, name: m.name, kind: staffKind(m.clearance), status: m.status, statusDate: m.statusDate });

    const staffMap = new Map(staff.map((m) => [ m.id, m ]));
    const classMap = new Map(classes.map((c) => [ c.id, c ]));
    const classesOfUser = new Map<number, Class[]>();
    for (const c of classes)
        for (const u of c.users)
            classesOfUser.set(u, [ ...(classesOfUser.get(u) ?? []), c ]);

    const mentorByStudent = new Map<number, number>();
    for (const m of staff) for (const mentee of m.mentees) mentorByStudent.set(mentee, m.id);
    for (const s of students) if (s.mentor != null) mentorByStudent.set(s.id, s.mentor);

    const candidates: MentionEntity[] = [
        ...students.map((s) => ({ kind: "student" as const, id: s.id, name: s.display_name })),
        ...staff.map((m) => ({ kind: staffKind(m.clearance), id: m.id, name: m.name })),
        ...classes.map((c) => ({ kind: c.type === ClassTypeEnum.Room ? "room" as const : "group" as const, id: c.id, name: c.name })),
    ].map((e) => ({ ...e, name: e.name.trim(), key: mentionKey(e.kind, e.id) })).filter((e) => e.name);

    const rank = (k: MentionKind) => MENTION_KINDS.indexOf(k);
    candidates.sort((a, b) => rank(a.kind) - rank(b.kind) || a.name.localeCompare(b.name, "he"));
    const seen = new Set<string>();
    const entities = candidates.filter((e) => !seen.has(e.name) && !!seen.add(e.name));

    const ofType = (userId: number, room: boolean) =>
        (classesOfUser.get(userId) ?? []).filter((c) => (c.type === ClassTypeEnum.Room) === room);

    return {
        entities,
        byKey: new Map(entities.map((e) => [ e.key, e ])),
        highlightable: entities.filter((e) => e.name.length >= MIN_HIGHLIGHT_LENGTH),
        person: (id) => people.get(id),
        staff: (id) => staffMap.get(id),
        classById: (id) => classMap.get(id),
        roomsOf: (id) => ofType(id, true),
        groupsOf: (id) => ofType(id, false),
        mentorOf: (id) =>
        {
            const mentor = mentorByStudent.get(id);
            return mentor === undefined ? undefined : people.get(mentor);
        },
        membersOf: (classId) =>
        {
            const members = (classMap.get(classId)?.users ?? []).map((u) => people.get(u)).filter((p): p is Person => !!p);
            return { students: members.filter((p) => p.kind === "student"), staff: members.filter((p) => p.kind !== "student") };
        },
    };
}

/** Entities matching a picker query, grouped in MENTION_KINDS order, capped per kind. */
export function searchMentions(entities: MentionEntity[], query: string, perKind = 5): MentionEntity[]
{
    const q = query.trim();
    const out: MentionEntity[] = [];
    for (const kind of MENTION_KINDS)
    {
        const matches = entities.filter((e) => e.kind === kind && e.name.includes(q));
        // Prefix matches first — they're what the writer is most likely typing.
        matches.sort((a, b) => Number(!a.name.startsWith(q)) - Number(!b.name.startsWith(q)));
        out.push(...matches.slice(0, perKind));
    }
    return out;
}
