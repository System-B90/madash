'use client';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { StatusCard, type StatusCardAction } from '@/components/errors/status-card';

const HIVE_URL = process.env.NEXT_PUBLIC_HIVE_URL?.replace(/\/$/, '');

/**
 * Mirrors `getHiveClearanceDeniedMessage` from @system-b90/hive-nextauth 0.2;
 * `gender` (a GenderEnum value) picks the Hebrew verb form.
 */
function clearanceInstruction(clearance: null | string, gender: null | string): null | string
{
    const pick = (male: string, female: string, neutral: string) =>
        gender === 'Male' ? male : gender === 'Female' ? female : neutral;
    switch (clearance)
    {
    case '1': // Hanich
        return `${ pick('גש', 'גשי', 'גש/י') } לחד"ס`;
    case '2': // Checker
        return `${ pick('תפנה', 'תפני', 'תפנה/י') } לאיש הסגל הקרוב לביתך`;
    default:
        return null;
    }
}

/**
 * Where hive-nextauth's clearance gate sends a user whose Hive login worked
 * but whose clearance isn't Segel/Admin (`?reason=clearance&clearance=<n>&gender=<g>`),
 * and where a page can send a signed-in user it won't serve (`?reason=forbidden`).
 */
function AccessDenied()
{
    const searchParams = useSearchParams();
    const isForbidden = searchParams.get('reason') === 'forbidden';
    const instruction = clearanceInstruction(searchParams.get('clearance'), searchParams.get('gender'));

    const actions: Array<StatusCardAction> = isForbidden
        ? [ { label: 'חזרה לדף הבית', href: '/', variant: 'contained' } ]
        : [
            { label: 'חזרה לדף ההתחברות', href: '/login', variant: 'contained' },
            ...(HIVE_URL ? [ { label: 'מעבר להייב (להחלפת משתמש)', href: HIVE_URL } ] : []),
        ];

    return (
        <StatusCard
            icon={ <LockOutlinedIcon /> }
            tone={ '--destructive' }
            title={ 'אין הרשאת גישה' }
            description={ isForbidden
                ? 'אין לך הרשאה לצפות בדף הזה.'
                : 'ההתחברות להייב הצליחה, אבל מדש זמין לאנשי סגל בלבד.' }
            highlight={ instruction }
            details={ instruction ? undefined : 'אם לדעתך מדובר בטעות, פנו לצוות המערכת.' }
            actions={ actions }
        />
    );
}

export default function AccessDeniedPage()
{
    return (
        <Suspense fallback={ null }>
            <AccessDenied />
        </Suspense>
    );
}
