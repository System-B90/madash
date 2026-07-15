import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, IconButton, useTheme } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Dayjs } from 'dayjs';
import React from 'react';

interface DateNavigatorProps {
  selectedDate: Dayjs;
  onDateChange: (date: Dayjs | null) => void;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ selectedDate, onDateChange }) => {
  const theme = useTheme();

  const handlePrevDay = () => {
    const newDate = selectedDate.subtract(1, 'day');
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = selectedDate.add(1, 'day');
    onDateChange(newDate);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap={2}
        sx={{
          backgroundColor: theme.palette.background.default,
        }}
      >
        <IconButton onClick={handlePrevDay}>
          <ChevronLeftIcon />
        </IconButton>
        <DatePicker
          label="בחר תאריך"
          value={selectedDate}
          onChange={onDateChange}
        />
        <IconButton onClick={handleNextDay}>
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </LocalizationProvider>
  );
};

export default DateNavigator;