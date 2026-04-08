import { useStudents } from "@/components/students-provider";
import { Box, BoxProps, Chip, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { Dispatch, SetStateAction } from "react";
export type StudentsSelectorProps = BoxProps & {
    selected: Array<number>;
    setSelected: Dispatch<SetStateAction<Array<number>>>;
};

export default function StudentsSelector({ selected, setSelected, ...props }: StudentsSelectorProps)
{
    const { students: allStudents, getStudent } = useStudents();

    const handleChange = (event: SelectChangeEvent<typeof selected>) =>
    {
        const { target: { value } } = event;

        const newIds = typeof value === 'string'
            ? value.split(',').map((v) => parseInt(v, 10))
            : value;

        setSelected(newIds);
    };

    const handleDelete = (hiveId: number) =>
    {
        setSelected(prev => prev.filter(id => id !== hiveId));
    };

    return (
        <Box
            { ...props }
            sx={ {
                display: 'flex',
                // Ensure the Box fills the height passed via props/flex-stretch
                height: '100%',
                ...props.sx
            } }
        >
            <FormControl
                fullWidth
                size="small"
                sx={ {
                    height: '100%',
                    '& .MuiInputBase-root': { height: '100%' } // Force Select to fill FormControl
                } }
            >
                <InputLabel
                    size="small"
                    sx={ {
                        backgroundColor: 'background.default',
                        px: '4px',
                        // Fix for the "line through label" in RTL focus states
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                            transform: 'translate(14px, -9px) scale(0.75)',
                        }
                    } }
                >
                    חניכים
                </InputLabel>
                <Select
                    multiple
                    size="small"
                    label="חניכים"
                    value={ selected }
                    onChange={ handleChange }
                    sx={ {
                        height: '100%',
                        '& .MuiSelect-select': {
                            height: '100% !important', // There is some MUI style class which overides this for some reason
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            // Ensure there is vertical padding even when stretched
                            py: 0
                        }
                    } }
                    renderValue={ (selectedIds) => (
                        <Box sx={ { display: 'flex', flexWrap: 'wrap', gap: 0.5 } }>
                            { selectedIds.map((hiveId) =>
                            {
                                const student = getStudent(hiveId);
                                return (
                                    <Chip
                                        key={ hiveId }
                                        label={ student?.name ?? hiveId }
                                        size="small"
                                        onDelete={ () => handleDelete(hiveId) }
                                        // Prevents the select menu from popping open when clicking the 'X'
                                        onMouseDown={ (e) => e.stopPropagation() }
                                    />
                                );
                            }) }
                        </Box>
                    ) }
                >
                    { allStudents.map((student) => (
                        <MenuItem key={ student.hiveId } value={ student.hiveId }>
                            { student.name }
                        </MenuItem>
                    )) }
                </Select>
            </FormControl>
        </Box>
    );
}