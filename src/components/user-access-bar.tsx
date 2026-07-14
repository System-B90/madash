'use client';

import React, { useEffect, useState, useCallback } from 'react';
import
{
    Box,
    Avatar,
    Skeleton,
    IconButton,
    Tooltip,
    Chip
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuth } from '@/components/auth-provider';
import { apiGetUserAvatar } from '@/api-client/user';

interface UserAvatarProps
{
    userId?: string;
    username?: string;
    className?: string;
}

export function UserAvatar({ userId, username = '?', className }: UserAvatarProps)
{
    const [ avatarUrl, setAvatarUrl ] = useState<string | null>(null);
    const [ loading, setLoading ] = useState<boolean>(true);

    useEffect(() =>
    {
        let isMounted = true;
        let currentObjectURL: string | null = null;

        const startFetch = async () =>
        {
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
            if (currentObjectURL)
            {
                URL.revokeObjectURL(currentObjectURL);
            }
        };
    }, [ userId ]);

    if (loading)
    {
        return <Skeleton variant="circular" width={ 32 } height={ 32 } />;
    }

    return (
        <Avatar
            src={ avatarUrl || undefined }
            alt={ username }
            className={ className }
            sx={ {
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                margin: "0 !important"
            } }
        >
            { username ? username.charAt(0).toUpperCase() : '?' }
        </Avatar>
    );
}

function ChipAvatar()
{
    const { userData, logout } = useAuth();

    if (!userData) return null;

    return (
        <Box
            sx={ {
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,

                "& .hive-avatar": {
                    transition:
                        "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
                },

                "& .logout-icon": {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(120%, -50%) rotate(-30deg)",
                    transition:
                        "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
                    opacity: 0,
                    pointerEvents: "none",
                    padding: 0,
                },

                "&:hover .logout-icon": {
                    transform: "translate(-50%, -50%)",
                    opacity: 1,
                    pointerEvents: "auto",
                },

                "&:hover .hive-avatar": {
                    transform: "translateX(-140%) rotate(30deg)",
                    opacity: 0.0,
                },
            } }
        >
            <UserAvatar
                userId={ userData.id }
                username={ userData.username }
                className="hive-avatar"
            />

            <Tooltip title="התנתקות">
                <IconButton
                    className="logout-icon"
                    color="error"
                    onClick={ logout }
                    size="small"
                    sx={ { p: 0.5 } }
                >
                    <LogoutIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
}

export default function UserAccessBar()
{
    const { userData } = useAuth();

    if (!userData) return null;

    return (
        <Chip
            avatar={ <ChipAvatar /> }
            color="secondary"
            label={ userData.display_name }
            size="medium"
            sx={ {
                height: 40,
                borderRadius: "20px",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                flexGrow: 1,
                justifyContent: "flex-start",
                paddingLeft: "6px",
                borderColor: "divider",
                backgroundColor: "background.paper",
                "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
                    borderColor: "primary.main",
                    backgroundColor: "action.hover",
                },
                "& .MuiChip-label": {
                    paddingRight: "8px",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color: "text.primary"
                },
                "& .MuiChip-avatar": {
                    marginLeft: "2px"
                }
            } }
            variant="outlined"
        />
    );
}
