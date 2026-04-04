export const dynamic = "force-dynamic";

import { ApiSuccess, catchHandler } from "@/api-server/common";
import { addGroupCalledToHadas, addStudentCalledToHadas, getStudentsCalledToHadas, removeEntityCalledToHadas, updateStateEntityCallToHadas } from "@/api-server/datastore";
import { CallStudentToHadasParams, RemoveEntityCallToHadasParams, UpdateStateEntityCallToHadasParams } from "@/api-shared/types";
import dayjs from "dayjs";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest
)
{
    try
    {
        return ApiSuccess(await getStudentsCalledToHadas());
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
            students.forEach((v) => addStudentCalledToHadas(v, reason, dayjs(expirationTime)));
        }
        else
        {
            // For group calls, we create a single entry with all students and a shared reason/expiration
            addGroupCalledToHadas(students, reason, dayjs(expirationTime));
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
        const { entity }: RemoveEntityCallToHadasParams = await request.json();

        removeEntityCalledToHadas(entity);
        const successMessage = entity.type === 'student' ? `הוסר קריאה לחד"ס עבור החניך ${entity.name}` : `הוסר קריאה לחד"ס עבור קבוצה עם מזהה ${entity.groupId}`;
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
        const { entity, state }: UpdateStateEntityCallToHadasParams = await request.json();

        updateStateEntityCallToHadas(entity, state);

        const successMessage = entity.type === 'student' ? `הוחלף מצב החניך ${entity.name} ל-${state}` : `מצב הקבוצה הווחלפה ל-${state}`;
        return ApiSuccess(
            successMessage
        );
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}
