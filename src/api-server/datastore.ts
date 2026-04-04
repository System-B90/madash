import { SendServerRequestToSessionServer } from "@/api-server/web-socket-utils";
import { CallToHadasError } from "@/api-shared/errors";
import { CalledToHadasEntityType, GroupToHadasData, ResolvableGroup, ResolvableStudent, EntityCallToHadasState, StudentToHadasData } from "@/api-shared/types";
import { MessageTypes } from "@/settings";
import { randomUUID } from "crypto";
import { Dayjs } from "dayjs";

type Data = {
    madratText: string;
    calledToHadas: Array<StudentToHadasData | GroupToHadasData>;
};

const data: Data = {
    madratText: '',
    calledToHadas: [],
};

export async function getMadratText()
{
    return data[ 'madratText' ];
}

export async function modifyMadratText(newText: string)
{
    data[ 'madratText' ] = newText;
    SendServerRequestToSessionServer({ type: MessageTypes.MADRAT_TEXT_UPDATE, data: newText });
}

export async function getStudentsCalledToHadas()
{
    return data.calledToHadas;
}

export function addStudentCalledToHadas(student: ResolvableStudent, reason: string, expirationTime: Dayjs)
{
    const isDuplicate = data.calledToHadas.some((v) =>
        v.type === CalledToHadasEntityType.Student &&
        v.student.hiveId === student.hiveId &&
        v.reason === reason &&
        v.expirationTime.isSame(expirationTime)
    );

    if (isDuplicate)
    {
        throw new CallToHadasError("הקריאה הזו כבר קיימת עבור חניך זה עם אותו הסיבה וזמן בדיוק.");
    }

    data.calledToHadas.push({
        student,
        reason,
        expirationTime,
        state: 'requested',
        type: CalledToHadasEntityType.Student
    });

    SendServerRequestToSessionServer({ type: MessageTypes.STUDENTS_TO_HADAS_UPDATE });
}

export function addGroupCalledToHadas(students: ResolvableStudent[], reason: string, expirationTime: Dayjs)
{
    const isDuplicate = data.calledToHadas.some((v) =>
    {
        if (v.type !== CalledToHadasEntityType.Group) return false;
        if (v.reason !== reason) return false;
        if (!v.expirationTime.isSame(expirationTime)) return false;
        if (v.students.length !== students.length) return false;

        const existingIds = new Set(v.students.map((s) => s.hiveId));
        return students.every((s) => existingIds.has(s.hiveId));
    });

    if (isDuplicate)
    {
        throw new CallToHadasError("הקריאה הזו כבר קיימת עבור קבוצה זו עם אותה הסיבה וזמן בדיוק.");
    }

    const groupId = `g-${randomUUID()}`;

    data.calledToHadas.push({
        groupId,
        students,
        reason,
        expirationTime,
        state: 'requested',
        type: CalledToHadasEntityType.Group
    });

    SendServerRequestToSessionServer({ type: MessageTypes.STUDENTS_TO_HADAS_UPDATE });
}

export function removeEntityCalledToHadas(entity: ResolvableStudent | ResolvableGroup)
{
    switch (entity.type)
    {
        case CalledToHadasEntityType.Student:
            data.calledToHadas = data.calledToHadas
                .filter((x) => x.type === CalledToHadasEntityType.Student)
                .filter((v: { student: ResolvableStudent; }) => v.student.hiveId !== entity.hiveId);
            break;
        case CalledToHadasEntityType.Group:
            data.calledToHadas = data.calledToHadas
                .filter((x) => x.type === CalledToHadasEntityType.Group)
                .filter((v: { groupId: string; }) => v.groupId !== entity.groupId);
            break;
    }
    SendServerRequestToSessionServer({ type: MessageTypes.STUDENTS_TO_HADAS_UPDATE });
}

export function updateStateEntityCallToHadas(
    entity: ResolvableStudent | ResolvableGroup,
    state: EntityCallToHadasState
): void
{
    const entityToUpdate = data.calledToHadas.find((v) =>
    {
        if (entity.type === CalledToHadasEntityType.Student && v.type === CalledToHadasEntityType.Student)
        {
            return v.student?.hiveId === entity.hiveId;
        }

        if (entity.type === CalledToHadasEntityType.Group && v.type === CalledToHadasEntityType.Group)
        {
            return v.groupId === entity.groupId;
        }

        return false;
    });

    if (!entityToUpdate) return;

    entityToUpdate.state = state;
    SendServerRequestToSessionServer({ type: MessageTypes.STUDENTS_TO_HADAS_UPDATE });
}