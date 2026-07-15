export const dynamic = "force-dynamic";

import dayjs from "dayjs";
import { NextRequest } from "next/server";

import { ApiSuccess, catchHandler } from "@/api-server/common";
import { addGroupCallToHadas, addStudentCallToHadas, getCallsToHadas, removeCallToHadas, updateCallToHadasState } from "@/api-server/datastore";
import { CallStudentToHadasParams, RemoveEntityCallToHadasParams, UpdateStateEntityCallToHadasParams } from "@/api-shared/types";

export async function GET(
    request: NextRequest
)
{
    try
    {
        return ApiSuccess(await getCallsToHadas());
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}

export async function PUT(
    request: NextRequest
)
{
    try
    {
        const { students, reason, expirationTime, groupCall }: CallStudentToHadasParams = await request.json();

        if (!groupCall)
        {
            students.forEach((v) => addStudentCallToHadas(v, reason, dayjs(expirationTime)));
        }
        else
        {
            // For group calls, we create a single entry with all students and a shared reason/expiration
            addGroupCallToHadas(students, reason, dayjs(expirationTime));
        }

        return ApiSuccess(
            `החניכים ${students.map((s) => s.name).join(', ')} נקראו לחד"ס`
        );
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}

export async function DELETE(
    request: NextRequest
)
{
    try
    {
        const { callId }: RemoveEntityCallToHadasParams = await request.json();

        const entity = removeCallToHadas(callId);
        const successMessage = entity.type === 'student' ? `הוסר קריאה לחד"ס עבור החניך ${entity.student.name}` : `הוסר קריאה לחד"ס עבור קבוצה ${entity.groupName}`;
        return ApiSuccess(
            successMessage
        );
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}

export async function POST(
    request: NextRequest
)
{
    try
    {
        const { callId, state }: UpdateStateEntityCallToHadasParams = await request.json();

        const entity = updateCallToHadasState(callId, state);

        const successMessage = entity.type === 'student' ? `הוחלף מצב החניך ${entity.student.name} ל-${state}` : `מצב הקבוצה הווחלפה ל-${state}`;
        return ApiSuccess(
            successMessage
        );
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}
