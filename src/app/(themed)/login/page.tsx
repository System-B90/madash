'use client';
import { Alert, Box, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import LoginWithHive from '@/app/(themed)/login/login-with-hive-button';

// NextAuth redirects failed sign-ins to /login?error=<code>:
// https://next-auth.js.org/configuration/pages#sign-in-page
const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
    AccessDenied: 'התחברות נכשלה: אין לך הרשאה לגשת למערכת.',
    OAuthCallback: 'התחברות נכשלה: שגיאה בתקשורת עם הייב. נסו שוב.',
    OAuthSignin: 'התחברות נכשלה: שגיאה בתקשורת עם הייב. נסו שוב.',
    Configuration: 'התחברות נכשלה: שגיאה בהגדרות המערכת.',
    Verification: 'התחברות נכשלה: אימות החשבון נכשל.',
};

const DEFAULT_SIGN_IN_ERROR_MESSAGE = 'התחברות נכשלה: אירעה שגיאה לא צפויה. נסו שוב.';

function SignInErrorAlert()
{
    const searchParams = useSearchParams();
    const errorCode = searchParams.get('error');

    if (!errorCode)
    {
        return null;
    }

    return (
        <Alert severity={ 'error' }>
            { SIGN_IN_ERROR_MESSAGES[ errorCode ] ?? DEFAULT_SIGN_IN_ERROR_MESSAGE }
        </Alert>
    );
}

function LoginWidget()
{
    return (
        <Box
            width={ '100%' }
            maxWidth={ '448px' }
            display={ 'flex' }
            flexDirection={ 'column' }
            gap={ 4 }
            borderRadius={ '12px' }
            bgcolor={ 'hsl(var(--background))' }
            p={ 5 }
            boxShadow={ '0 20px 25px -5px hsl(var(--foreground) / 0.1), 0 10px 10px -5px hsl(var(--foreground) / 0.04)' }
            border={ '1px solid hsl(var(--border))' }
        >
            {/* Header Section */ }
            <Box
                textAlign={ 'center' }
                fontSize={ 30 }
                fontWeight={ 'bold' }
                display={ 'flex' }
                flexDirection={ 'column' }
                alignItems={ 'center' }
            >
                {/* <Logo width={ '8rem' } height={ '8rem' } /> */ }
                <Typography
                    fontSize={ 'inherit' }
                    component={ 'h2' }
                    mt={ 1 }
                    fontWeight={ 'bold' }
                    letterSpacing={ '-0.02em' }
                    color={ 'textPrimary' }
                >
                    ברוכים הבאים למדש
                </Typography>

                <Typography
                    component={ 'p' }
                    mt={ 0 }
                    fontSize={ 14 }
                    color={ 'textSecondary' }
                >
                    מה חדש?
                </Typography>

            </Box>

            {/* useSearchParams requires a Suspense boundary during prerender */ }
            <Suspense fallback={ null }>
                <SignInErrorAlert />
            </Suspense>

            <Box mt={ 0 }>
                <LoginWithHive />
            </Box>
        </Box>
    );
}

export default function LoginPage()
{
    return (
        <Box
            width={ 'full' }
            height={ '100vh' }
            display={ 'flex' }
            alignItems={ 'flex-start' }
            justifyContent={ 'center' }
            alignContent={ 'flex-start' }
            justifyItems={ 'flex-start' }
            pt={ '20vh' }
            bgcolor={ 'hsl(var(--background))' }>
            <LoginWidget />
        </Box>
    );
}
