'use client'; // <-- 1. Required for MUI components and hooks in Next.js App Router

import React from 'react';
import { TextField, Typography, Box, useTheme } from '@mui/material';

interface JournalHeaderProps
{
    customName: string;
    isReadOnly: boolean;
    onNameChange: (name: string) => void;
}

const JournalHeader: React.FC<JournalHeaderProps> = ({
    customName,
    isReadOnly,
    onNameChange,
}) =>
{
    const theme = useTheme();

    return (
        <Box mb={ 3 }>
            <Typography
                variant="h5"
                gutterBottom
                sx={ {
                    fontWeight: 'bold',
                    color: theme.palette.text.primary,
                } }
            >
                שם היום
            </Typography>
            <TextField
                fullWidth
                label="הכנס שם ליום"
                placeholder="לדוגמה: יום עמוס, יום רגיל"
                value={ customName }
                onChange={ (e) => onNameChange(e.target.value) }
                disabled={ isReadOnly }
                variant="outlined"
                size="small"
                // 2. Removed the malformed slotProps block entirely
                sx={ {
                    '& .MuiOutlinedInput-root': {
                        color: theme.palette.text.primary, // This already styles the input text properly!
                        '& fieldset': {
                            borderColor: theme.palette.divider,
                        },
                        '&:hover fieldset': {
                            borderColor: theme.palette.primary.main,
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: theme.palette.primary.main,
                        },
                    },
                    '& .MuiInputBase-input::placeholder': {
                        color: theme.palette.text.secondary,
                        opacity: 1,
                    },
                } }
            />
        </Box>
    );
};

export default JournalHeader;