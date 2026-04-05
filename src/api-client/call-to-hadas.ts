import { safeApiFetcher } from "@/api-client/common";
import { CallStudentToHadasParams, RemoveEntityCallToHadasParams, CalledToHadasData, UpdateStateEntityCallToHadasParams, Data } from "@/api-shared/types";


export async function apiGetStudentsCalledToHadas()
{
    const data = (await safeApiFetcher('/api/call-to-hadas'));
    return data as Data[ 'calledToHadas' ];
}

export async function apiCallStudentToHadas({ ...params }: CallStudentToHadasParams)
{
    const response = await safeApiFetcher('/api/call-to-hadas', {
        method: 'PUT',
        body: JSON.stringify({
            ...params
        })
    });
    return response as string;
}

export async function apiRemoveStudentCallToHadas({ ...params }: RemoveEntityCallToHadasParams)
{
    await safeApiFetcher('/api/call-to-hadas', {
        method: 'DELETE',
        body: JSON.stringify({
            ...params
        })
    });
    return;
}

export async function apiUpdateStateStudentCallToHadas({ ...params }: UpdateStateEntityCallToHadasParams)
{
    await safeApiFetcher('/api/call-to-hadas', {
        method: 'POST',
        body: JSON.stringify({
            ...params
        })
    });
    return;
}
