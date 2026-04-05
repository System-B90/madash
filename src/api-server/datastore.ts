import { SendServerRequestToSessionServer } from "@/api-server/web-socket-utils";
import { CallToHadasError } from "@/api-shared/errors";
import { CalledToHadasEntityType, ResolvableStudent, EntityCallToHadasState, entityUid, CalledToHadasDataBase, Data } from "@/api-shared/types";
import { MessageTypes } from "@/settings";
import { Dayjs } from "dayjs";

const data: Data = {
    madratText: '',
    calledToHadas: {},
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

export async function getCallsToHadas()
{
    return data.calledToHadas;
}

export function addStudentCallToHadas(student: ResolvableStudent, reason: string, expirationTime: Dayjs)
{
    const newId = entityUid({ type: CalledToHadasEntityType.Student, student, reason, expirationTime });
    const isDuplicate = newId in data.calledToHadas;

    if (isDuplicate)
    {
        throw new CallToHadasError("הקריאה הזו כבר קיימת עבור חניך זה עם אותו הסיבה וזמן בדיוק.");
    }

    data.calledToHadas[ newId ] = {
        callId: newId,
        student,
        reason,
        expirationTime,
        state: 'requested',
        type: CalledToHadasEntityType.Student
    };

    SendServerRequestToSessionServer({ type: MessageTypes.STUDENTS_TO_HADAS_UPDATE });

    return newId;
}

export function addGroupCallToHadas(students: ResolvableStudent[], reason: string, expirationTime: Dayjs)
{
    const groupId = entityUid({ type: CalledToHadasEntityType.Group, students, reason, expirationTime });
    const isDuplicate = groupId in data.calledToHadas;

    if (isDuplicate)
    {
        throw new CallToHadasError("הקריאה הזו כבר קיימת עבור קבוצה זו עם אותה הסיבה וזמן בדיוק.");
    }

    data.calledToHadas[ groupId ] = {
        callId: groupId,
        students,
        reason,
        expirationTime,
        state: 'requested',
        type: CalledToHadasEntityType.Group
    };

    SendServerRequestToSessionServer({ type: MessageTypes.STUDENTS_TO_HADAS_UPDATE });

    return groupId;
}

export function removeCallToHadas(callId: CalledToHadasDataBase[ 'callId' ])
{
    if (!(callId in data.calledToHadas)) 
    {
        throw new CallToHadasError("הקריאה לא קיימת.");
    }
    const entityToRemove = data.calledToHadas[ callId ];
    delete data.calledToHadas[ callId ];
    SendServerRequestToSessionServer({ type: MessageTypes.STUDENTS_TO_HADAS_UPDATE });
    return entityToRemove;
}

export function updateCallToHadasState(
    callId: CalledToHadasDataBase[ 'callId' ],
    state: EntityCallToHadasState
)
{

    const entityToUpdate = data.calledToHadas[ callId ];
    if (!entityToUpdate) 
    {
        throw new CallToHadasError("הקריאה לא קיימת.");
    }
    entityToUpdate.state = state;
    SendServerRequestToSessionServer({ type: MessageTypes.STUDENTS_TO_HADAS_UPDATE });

    return entityToUpdate;
}
