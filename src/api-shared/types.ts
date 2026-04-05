import { createHash } from "crypto";
import { Dayjs } from "dayjs";

export type StudentName = string;
export interface ResolvableEntity
{
    type: CalledToHadasEntityType;
}
export interface ResolvableStudent extends ResolvableEntity
{
    name: StudentName;
    hiveId: number;
    type: CalledToHadasEntityType.Student;
};
export interface ResolvableGroup extends ResolvableEntity
{
    groupId: string;
    type: CalledToHadasEntityType.Group;
};
export type EntityCallToHadasState = 'requested' | 'told';
export enum CalledToHadasEntityType
{
    Student = 'student',
    Group = 'group',
}
export interface CalledToHadasDataBase
{
    callId: string;
    reason: string;
    expirationTime: Dayjs;
    state: EntityCallToHadasState;
    type: CalledToHadasEntityType;
};
export interface StudentToHadasData extends CalledToHadasDataBase
{
    student: ResolvableStudent;
    type: CalledToHadasEntityType.Student;
};
export interface GroupToHadasData extends CalledToHadasDataBase
{
    students: Array<ResolvableStudent>;
    type: CalledToHadasEntityType.Group;
    groupName?: string;
};
export type CalledToHadasData = StudentToHadasData | GroupToHadasData;

export interface StudentData extends ResolvableStudent
{
    hiveId: number; // Hive designated number
    bisId: number; // Bis designated number
    name: StudentName;
    room: string;
    callToHadas?: Partial<StudentToHadasData>;
};

export type CallStudentToHadasParams = { students: Array<ResolvableStudent>; reason: StudentToHadasData[ 'reason' ]; expirationTime: StudentToHadasData[ 'expirationTime' ]; groupCall: boolean; };
export type UpdateStateEntityCallToHadasParams = { callId: CalledToHadasDataBase[ 'callId' ]; state: StudentToHadasData[ 'state' ]; };
export type RemoveEntityCallToHadasParams = { callId: CalledToHadasDataBase[ 'callId' ]; };

export function entityUid(entity: Omit<StudentToHadasData, 'callId' | 'state'> | Omit<GroupToHadasData, 'callId' | 'state'>): string
{
    const reasonHash = createHash('md5').update(entity.reason).digest('hex');
    const expirationTimeHash = createHash('md5').update(entity.expirationTime.toISOString()).digest('hex');
    switch (entity.type)
    {
        case CalledToHadasEntityType.Student:
            const studentEntity = entity as StudentToHadasData;
            const studentHash = createHash('md5').update(studentEntity.student.hiveId.toString()).digest('hex');
            return `${entity.type}-${reasonHash}-${expirationTimeHash}-${studentHash}`;
        case CalledToHadasEntityType.Group:
            const groupEntity = entity as GroupToHadasData;
            const studentsHash = createHash('md5').update(groupEntity.students.map((s) => s.hiveId).sort().join(',')).digest('hex');
            return `${entity.type}-${reasonHash}-${expirationTimeHash}-${studentsHash}`;
    }
}

export type Data = {
    madratText: string;
    calledToHadas: Record<string, StudentToHadasData | GroupToHadasData>;
};
