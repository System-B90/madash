/**
 * Where to land after signing in: a same-origin path from `?callbackUrl=`
 * (the CLI login page, /cli-auth, sends users to /login with one), else the
 * dashboard. Protocol-relative (`//host`, `/\host`) and absolute URLs are
 * refused -- this must never become an open redirect.
 */
export function safeCallbackUrl(value: string | null): string
{
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
    {
        return '/';
    }
    return value;
}
