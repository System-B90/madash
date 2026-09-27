'use client';

import { Box, Tooltip } from '@mui/material';
import type { ReactNode } from 'react';

import type { MentionDirectory, MentionEntity } from '@/api-shared/mentions';
import MentionCard from '@/components/mentions/mention-card';
import { MENTION_KIND_STYLE } from '@/components/mentions/mention-kinds';

/** An inline tag in rendered text: kind icon + name in the kind's colour, with a hover card. */
export default function MentionChip({ entity, dir, children }: { entity: MentionEntity; dir: MentionDirectory; children: ReactNode; })
{
    const { icon: Icon, palette } = MENTION_KIND_STYLE[ entity.kind ];
    return (
        <Tooltip
            title={ <MentionCard entity={ entity } dir={ dir } /> }
            placement="top"
            arrow
            enterDelay={ 150 }
            slotProps={ {
                tooltip: {
                    sx: {
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        border: 1,
                        borderColor: 'divider',
                        boxShadow: 8,
                        p: 1.25,
                        maxWidth: 'none',
                    },
                },
                arrow: { sx: { color: 'background.paper', '&::before': { border: 1, borderColor: 'divider' } } },
            } }
        >
            <Box
                component="span"
                data-testid="mention"
                data-kind={ entity.kind }
                data-mention-key={ entity.key }
                sx={ {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.25,
                    paddingInline: 0.5,
                    borderRadius: 0.75,
                    fontWeight: 600,
                    color: `${palette}.main`,
                    bgcolor: (theme) => `rgba(${theme.vars!.palette[ palette ].mainChannel} / 0.14)`,
                    cursor: 'default',
                    verticalAlign: 'baseline',
                } }
            >
                <Icon sx={ { fontSize: '1em' } } />
                { children }
            </Box>
        </Tooltip>
    );
}
