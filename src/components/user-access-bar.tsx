'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Avatar, Skeleton } from '@mui/material';

import { useAuth } from '@/components/auth-provider';
import { apiGetUserAvatar } from '@/api-client/user';

export default function UserAccessBar()
{
    const { userData } = useAuth();
    const [ avatarUrl, setAvatarUrl ] = useState<string | null>(null);
    const [ loading, setLoading ] = useState<boolean>(true);
    const [ prevUserId, setPrevUserId ] = useState<string | undefined>(userData?.id);

    if (userData?.id !== prevUserId)
    {
        setPrevUserId(userData?.id);
        setLoading(true);
        setAvatarUrl(null);
    }

    const fetchAvatar = useCallback((userId: string | undefined) =>
    {
        if (!userId) return;

        let isMounted = true;
        let objectUrl: string | null = null;

        apiGetUserAvatar(userId)
            .then((blob) =>
            {
                if (!isMounted) return;

                if (blob)
                {
                    objectUrl = URL.createObjectURL(blob);
                    setAvatarUrl(objectUrl);
                } else
                {
                    setAvatarUrl(null);
                }
            })
            .catch((err) =>
            {
                console.error("[UserAccessBar] Failed to fetch avatar blob:", err);
                if (isMounted) setAvatarUrl(null);
            })
            .finally(() =>
            {
                if (isMounted) setLoading(false);
            });

        return () =>
        {
            isMounted = false;
            if (objectUrl)
            {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, []);

    useEffect(() =>
    {
        const cleanup = fetchAvatar(userData?.id);
        return () =>
        {
            if (cleanup) cleanup();
        };
    }, [ userData?.id, fetchAvatar ]);

    if (!userData) return null;

    return (
        <Box
            sx={ {
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                padding: '4px 12px 4px 6px',
                backgroundColor: 'background.paper',
                borderRadius: '50px',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1
            } }
        >
            { loading ? (
                <Skeleton variant="circular" width={ 36 } height={ 36 } />
            ) : (
                <Avatar
                    src={ avatarUrl || undefined }
                    alt={ userData.username }
                    sx={ {
                        width: 36,
                        height: 36,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                    } }
                >
                    { userData.username ? userData.username.charAt(0).toUpperCase() : '?' }
                </Avatar>
            ) }

            <Box display="flex" flexDirection="column" justifyContent="center">
                <Typography variant="caption" color="text.secondary" lineHeight={ 1 }>
                    מחובר כ-
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="text.primary" lineHeight={ 1.2 } mt={ 0.25 }>
                    { userData.display_name }
                </Typography>
            </Box>
        </Box>
    );
}
