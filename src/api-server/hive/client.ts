import { HiveClientError } from "@/api-shared/errors";
import { Class, CourseUser } from "@/api-shared/hive-types";

export class HiveClient
{
    private accessToken: string;
    private refreshTokenValue?: string;

    constructor(accessToken: string, refreshToken?: string)
    {
        this.accessToken = accessToken;
        this.refreshTokenValue = refreshToken;
    }

    private buildUrl(path: string): string
    {
        return `${process.env.NEXT_PUBLIC_HIVE_URL}${path}`;
    }

    private async refreshAccessToken(): Promise<void>
    {
        if (!this.refreshTokenValue)
        {
            throw new HiveClientError('אין טוקן רפרש זמין, אנא התחבר מחדש');
        }

        const response = await fetch(this.buildUrl('/api/core/token/refresh/'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh: this.refreshTokenValue
            })
        });

        if (!response.ok)
        {
            throw new HiveClientError('עדכון הטוקן נכשל, אנא התחבר מחדש');
        }

        const data = await response.json();
        this.accessToken = data.access;

        if (data.refresh)
        {
            this.refreshTokenValue = data.refresh;
        }
    }

    private async _get<T>(url: string, isRetry = false): Promise<T>
    {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 401)
        {
            if (!isRetry && this.refreshTokenValue)
            {
                await this.refreshAccessToken();
                return this._get<T>(url, true);
            }
            throw new HiveClientError('הטוקן אינו תקף, אנא התחבר מחדש');
        }

        if (response.status === 500)
        {
            await new Promise(resolve => setTimeout(resolve, 200));
            return this._get<T>(url, isRetry);
        }

        if (!response.ok)
        {
            throw new HiveClientError(`טעינת מידע מהייב נכשלה: ${response.statusText}`);
        }

        return response.json();
    }

    async getUsers(params: Record<string, string>): Promise<Array<CourseUser>>
    {
        const queryString = new URLSearchParams(params).toString();
        return this._get<Array<CourseUser>>(this.buildUrl(`/api/core/management/users/?${queryString}`));
    }

    async getClasses(): Promise<Array<Class>>
    {
        return this._get<Array<Class>>(this.buildUrl('/api/core/management/classes/'));
    }
}
