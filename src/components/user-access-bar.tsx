'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Avatar, Skeleton, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuth } from '@/components/auth-provider';
import { apiGetUserAvatar } from '@/api-client/user';

interface UserAvatarProps
{
    userId?: string;
    username?: string;
}

export function UserAvatar({ userId, username = '?' }: UserAvatarProps)
{
    const [ avatarUrl, setAvatarUrl ] = useState<string | null>(null);
    const [ loading, setLoading ] = useState<boolean>(true);

    useEffect(() =>
    {
        let isMounted = true;
        let currentObjectURL: string | null = null;

        const startFetch = async () =>
        {
            // Satisfy linter by deferring synchronous state updates to a microtask.
            // This prevents cascading renders during the initial effect execution.
            queueMicrotask(() =>
            {
                if (isMounted)
                {
                    setLoading(true);
                    setAvatarUrl(null);
                }
            });

            if (!userId)
            {
                queueMicrotask(() => { if (isMounted) setLoading(false); });
                return;
            }

            try
            {
                const blob = await apiGetUserAvatar(userId);

                // Guard against updates if the component unmounted or userId changed
                if (!isMounted) return;

                if (blob)
                {
                    currentObjectURL = URL.createObjectURL(blob);
                    setAvatarUrl(currentObjectURL);
                } else
                {
                    setAvatarUrl(null);
                }
            } catch (err)
            {
                console.error("[UserAvatar] Failed to fetch avatar blob:", err);
                if (isMounted) setAvatarUrl(null);
            } finally
            {
                if (isMounted) setLoading(false);
            }
        };

        startFetch();

        return () =>
        {
            isMounted = false;
            // Immediate cleanup of the Blob URL to prevent memory leaks
            if (currentObjectURL)
            {
                URL.revokeObjectURL(currentObjectURL);
            }
        };
    }, [ userId ]);

    if (loading)
    {
        return <Skeleton variant="circular" width={ 36 } height={ 36 } />;
    }

    return (
        <Avatar
            src={ avatarUrl || undefined }
            alt={ username }
            sx={ {
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '1rem',
                fontWeight: 'bold'
            } }
        >
            { username ? username.charAt(0).toUpperCase() : '?' }
        </Avatar>
    );
}

export default function UserAccessBar()
{
    const { userData, logout } = useAuth();

    if (!userData) return null;

    return (
        <Box
            display={ 'flex' }
            flexDirection={ 'row' }
            alignItems={ 'center' }
            justifyContent={ 'space-between' }
            sx={ {
                padding: '4px 12px 4px 6px',
                backgroundColor: 'background.paper',
                borderRadius: '50px',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1
            } }
        >
            <Box sx={ {
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
            } }>
                <UserAvatar userId={ userData.id } username={ userData.username } />

                <Box display="flex" flexDirection="column" justifyContent="center">
                    <Typography variant="caption" color="text.secondary" lineHeight={ 1 }>
                        מחובר כ-
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="text.primary" lineHeight={ 1.2 } mt={ 0.25 }>
                        { userData.display_name }
                    </Typography>
                </Box>
            </Box>

            <Tooltip title="התנתק">
                <IconButton
                    onClick={ logout }
                    size="small"
                    color="error"
                    sx={ { ml: 1 } }
                    aria-label="logout"
                >
                    <LogoutIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
}
