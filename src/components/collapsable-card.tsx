import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Paper, Box, Typography, Divider, SvgIconProps, Collapse } from "@mui/material";
import { ReactNode, useState, ElementType } from "react";

export default function CollapsableCard({
    name,
    icon: Icon,
    mainColor,
    content
}: {
    name: string,
    icon: ElementType,
    mainColor: SvgIconProps[ 'color' ],
    content: ReactNode;
})
{
    const [ collapsed, setCollapsed ] = useState<boolean>(false);

    const handleToggle = () =>
    {
        setCollapsed((prev) => !prev);
    };

    return (
        <Paper elevation={ 2 } sx={ { overflow: 'hidden', borderRadius: 3, border: '1px solid', borderColor: 'divider' } }>
            <Box
                onClick={ handleToggle }
                sx={ {
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: 'action.hover' }
                } }
            >
                {/* The JSX function is rendered here as a standard component */ }
                <Icon color={ mainColor } fontSize="small" />

                <Typography variant="subtitle1" fontWeight="bold" color="text.primary" sx={ { flexGrow: 1 } }>
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
                <Box sx={ { display: 'flex', flexDirection: 'column', bgcolor: 'background.default', minHeight: 80 } }>
                    { content }
                </Box>
            </Collapse>
        </Paper>
    );
}
