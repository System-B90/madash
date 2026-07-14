'use client';

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { SnackbarProvider } from 'notistack';

export default function ThemedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>)
{
    return (
        <LocalizationProvider adapterLocale="he" dateAdapter={ AdapterDayjs }>
            <SnackbarProvider anchorOrigin={ { horizontal: 'right', vertical: 'bottom' } }>
                { children }
            </SnackbarProvider>
        </LocalizationProvider>
    );
}
