import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Paper, Box, Typography, Divider, SvgIconProps, Collapse } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { ReactNode, useState, ElementType } from "react";

export default function CollapsableCard({
    name,
    icon: Icon,
    mainColor,
    content,
    contentSx,
}: {
    name: string,
    icon: ElementType,
    mainColor: SvgIconProps[ 'color' ],
    content: ReactNode;
    contentSx?: SxProps<Theme>;
})
{
    const [ collapsed, setCollapsed ] = useState<boolean>(false);

    const handleToggle = () =>
    {
        setCollapsed((prev) => !prev);
    };

    return (
        <Paper
            elevation={ 0 }
            sx={ {
                overflow: 'hidden',
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: (theme) => `0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px ${theme.vars!.palette.divider}`,
            } }
        >
            <Box
                onClick={ handleToggle }
                sx={ {
                    px: 2.25,
                    py: 1.75,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    cursor: 'pointer',
                    userSelect: 'none',
                    bgcolor: (theme) => `rgba(${theme.vars!.palette.text.primaryChannel} / 0.03)`,
                    '&:hover': { bgcolor: 'action.hover' }
                } }
            >
                {/* The JSX function is rendered here as a standard component */ }
                <Icon color={ mainColor } fontSize="small" />

                <Typography variant="subtitle1" fontWeight={ 700 } color="text.primary" sx={ { flexGrow: 1, letterSpacing: '-0.01em' } }>
                    { name }
                </Typography>

                <ExpandMoreIcon
                    sx={ {
                        transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                        transition: 'transform 0.3s ease',
                        color: 'text.secondary'
                    } }
                />
            </Box>

            <Divider />

            <Collapse in={ !collapsed } timeout="auto" unmountOnExit>
                <Box
                    sx={ {
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: 'background.default',
                        minHeight: 0,
                    } }
                >
                    <Box sx={ contentSx }>{ content }</Box>
                </Box>
            </Collapse>
        </Paper>
    );
}
