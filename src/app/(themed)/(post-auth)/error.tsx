'use client';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useEffect } from 'react';

import { StatusCard } from '@/components/errors/status-card';

/** Segment-level error page for every authenticated route. */
export default function PostAuthError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
})
{
    useEffect(() =>
    {
        console.error('[post-auth error boundary]', error);
    }, [ error ]);

    return (
        <StatusCard
            icon={ <ErrorOutlineIcon /> }
            tone={ '--destructive' }
            title={ 'משהו השתבש' }
            description={ 'לא הצלחנו להציג את הדף הזה. אפשר לנסות לטעון אותו מחדש, או לחזור לדף הבית.' }
            details={ error.digest ?? error.message }
            actions={ [
                { label: 'נסו שוב', onClick: () => reset(), variant: 'contained' },
                { label: 'חזרה לדף הבית', href: '/' },
            ] }
        />
    );
}
