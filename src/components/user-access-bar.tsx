'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, Skeleton } from '@mui/material';

// Adjust imports based on your exact file structure
import { useAuth } from '@/components/auth-provider';
import { apiGetUserAvatar } from '@/api-client/user';

export default function UserAccessBar()
{
    const { userData } = useAuth();
    const [ avatarUrl, setAvatarUrl ] = useState<string | null>(null);
    const [ loading, setLoading ] = useState<boolean>(true);

    useEffect(() =>
    {
        if (!userData?.id)
        {
            setLoading(false);
            return;
        }

        let isMounted = true;
        let objectUrl: string | null = null;

        setLoading(true);

        apiGetUserAvatar(userData.id)
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
            // CRITICAL: Prevent memory leaks by revoking the blob URL
            if (objectUrl)
            {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [ userData?.id ]);

    // Do not render if the user data hasn't loaded yet
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
