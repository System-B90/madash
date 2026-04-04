'use client';

import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { SnackbarProvider } from 'notistack';
import { prefixer } from 'stylis';

const darkTheme = createTheme({
    direction: 'rtl',
    palette: {
        mode: 'dark',
        primary: {
            main: '#00E676', // Vibrant Green
            light: '#66FFA6',
            dark: '#00B248',
            contrastText: '#000000',
        },
        secondary: {
            main: '#D500F9', // Neon Purple
            light: '#FA51FF',
            dark: '#9E00C5',
            contrastText: '#FFFFFF',
        },
        info: {
            main: '#00E5FF', // Cyan/Blue
            light: '#6EFFFF',
            dark: '#00B2CC',
            contrastText: '#000000',
        },
        background: {
            default: '#0B0F19', // Deep Blue-Tinted Background
            paper: '#131B2F',   // Elevated Blue-Gray for cards and surfaces
        },
        text: {
            primary: '#F8FAFC',
            secondary: '#94A3B8',
        }
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    // Removes the default MUI white overlay on elevated dark surfaces 
                    // to keep the custom background colors pure.
                    backgroundImage: 'none',
                }
            }
        }
    }
});

const rtlCache = createCache({
    key: 'muirtl',
    stylisPlugins: [ prefixer, rtlPlugin ],
});

export default function ThemedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>)
{
    return (
        <CacheProvider value={ rtlCache }>
            <ThemeProvider theme={ darkTheme }>
                <CssBaseline />
                <SnackbarProvider anchorOrigin={ { horizontal: 'right', vertical: 'bottom' } }>
                    { children }
                </SnackbarProvider>
            </ThemeProvider>
        </CacheProvider>
    );
}
