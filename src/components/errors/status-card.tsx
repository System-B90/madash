'use client';
import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export type StatusCardAction = {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: 'contained' | 'outlined' | 'text';
};

export type StatusCardProps = {
    icon: ReactNode;
    /** Icon badge colour, as a CSS var from globals.css. */
    tone?: '--destructive' | '--primary';
    title: string;
    description: ReactNode;
    /** Emphasised call-out between the description and the actions. */
    highlight?: ReactNode;
    /** Short technical hint (digest / code). Rendered monospace, muted. */
    details?: string;
    actions?: Array<StatusCardAction>;
};

/**
 * The single visual for every full-page status surface (access denied, 404,
 * crash). Same card as the login page so failures look like part of Madash,
 * not like Next's default English pages.
 */
export function StatusCard({ icon, tone = '--primary', title, description, highlight, details, actions = [] }: StatusCardProps)
{
    return (
        <Box
            width={ '100%' }
            height={ '100%' }
            overflow={ 'auto' }
            display={ 'flex' }
            alignItems={ 'flex-start' }
            justifyContent={ 'center' }
            pt={ '15vh' }
            px={ 2 }
            bgcolor={ 'hsl(var(--background))' }
        >
            <Box
                width={ '100%' }
                maxWidth={ '448px' }
                display={ 'flex' }
                flexDirection={ 'column' }
                alignItems={ 'center' }
                gap={ 3 }
                textAlign={ 'center' }
                borderRadius={ '12px' }
                bgcolor={ 'hsl(var(--background))' }
                p={ 5 }
                boxShadow={ '0 20px 25px -5px hsl(var(--foreground) / 0.1), 0 10px 10px -5px hsl(var(--foreground) / 0.04)' }
                border={ '1px solid hsl(var(--border))' }
            >
                <Box
                    width={ 64 }
                    height={ 64 }
                    borderRadius={ '50%' }
                    display={ 'flex' }
                    alignItems={ 'center' }
                    justifyContent={ 'center' }
                    color={ `hsl(var(${ tone }))` }
                    bgcolor={ `hsl(var(${ tone }) / 0.12)` }
                    sx={ { '& svg': { fontSize: 34 } } }
                >
                    { icon }
                </Box>

                <Box>
                    <Typography component={ 'h1' } fontSize={ 26 } fontWeight={ 'bold' } letterSpacing={ '-0.02em' } color={ 'textPrimary' }>
                        { title }
                    </Typography>
                    <Typography component={ 'p' } mt={ 1 } fontSize={ 14 } color={ 'textSecondary' }>
                        { description }
                    </Typography>
                </Box>

                { highlight ? (
                    <Box
                        width={ '100%' }
                        py={ 1.5 }
                        px={ 2 }
                        borderRadius={ '8px' }
                        fontSize={ 18 }
                        fontWeight={ 'bold' }
                        bgcolor={ 'hsl(var(--muted))' }
                        color={ 'hsl(var(--foreground))' }
                    >
                        { highlight }
                    </Box>
                ) : null }

                { details ? (
                    <Typography component={ 'p' } fontFamily={ 'monospace' } fontSize={ 11 } color={ 'textSecondary' } sx={ { wordBreak: 'break-word' } }>
                        { details }
                    </Typography>
                ) : null }

                { actions.length > 0 ? (
                    <Box width={ '100%' } display={ 'flex' } flexDirection={ 'column' } gap={ 1.5 }>
                        { actions.map((action) => (
                            <Button
                                key={ action.label }
                                fullWidth
                                size={ action.variant === 'contained' ? 'large' : 'medium' }
                                href={ action.href }
                                onClick={ action.onClick }
                                variant={ action.variant ?? 'text' }
                            >
                                { action.label }
                            </Button>
                        )) }
                    </Box>
                ) : null }
            </Box>
        </Box>
    );
}
