import SearchOffIcon from '@mui/icons-material/SearchOff';

import { StatusCard } from '@/components/errors/status-card';

/**
 * Replaces Next's built-in 404, which renders English and unthemed. Lives at
 * the app root so it also covers URLs that never reach the themed segments.
 */
export default function NotFound()
{
    return (
        <StatusCard
            icon={ <SearchOffIcon /> }
            title={ 'הדף לא נמצא' }
            description={ 'הקישור שגוי, או שהדף הועבר או נמחק.' }
            details={ '404' }
            actions={ [ { label: 'חזרה לדף הבית', href: '/', variant: 'contained' } ] }
        />
    );
}
