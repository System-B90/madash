export async function apiGetUserAvatar(userId: string): Promise<Blob | null>
{
    const response = await fetch(`/api/avatars/${userId}/`);
    console.log(`[apiGetUserAvatar] Fetching avatar for user ${userId}:`, response);
    if (!response.ok)
    {
        return null;
    }
    return response.blob();
}