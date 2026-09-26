'use client';

import {
  Box,
  CircularProgress,
  Alert,
  Container,
  Paper,
  Typography,
  Stack,
  useTheme,
} from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import React, { useState, useEffect } from 'react';

import { apiGetJournal, apiUpdateJournal } from '@/api-client/journal';
import { Journal } from '@/api-shared/journal';
import DateNavigator from '@/components/journal/DateNavigator';
import JournalHeader from '@/components/journal/JournalHeader';
import JournalList from '@/components/journal/JournalList';


const JournalPage: React.FC = () => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [journal, setJournal] = useState<Journal | null>(null);
  const [loadedDate, setLoadedDate] = useState<Dayjs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = loadedDate !== selectedDate;

  useEffect(() => {
    let cancelled = false;
    const dateStr = selectedDate.toISOString().split('T')[0];
    apiGetJournal(dateStr)
      .then((data) => {
        if (cancelled) return;
        setJournal(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoadedDate(selectedDate);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const handleNameChange = async (name: string) => {
    if (!journal) return;
    const updatedJournal = { ...journal, customName: name };
    setJournal(updatedJournal);
    await updateJournal(updatedJournal);
  };

  const handleTaskToggle = async (taskId: string) => {
    if (!journal) return;
    const updatedTasks = journal.tasks.map(task =>
      task.id === taskId
        ? { ...task, isCompleted: !task.isCompleted, completedAtTimestamp: !task.isCompleted ? new Date().toISOString() : undefined }
        : task
    );
    const updatedJournal = { ...journal, tasks: updatedTasks };
    setJournal(updatedJournal);
    await updateJournal(updatedJournal);
  };

  const updateJournal = async (journal: Journal) => {
    try {
      await apiUpdateJournal(journal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 4,
        backgroundColor: theme.palette.background.default,
        minHeight: '100vh',
      }}
    >
      <Stack spacing={3}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            textAlign: 'center',
            fontWeight: 'bold',
            color: theme.palette.text.primary,
          }}
        >
          {'יומן מדר"ת'}
        </Typography>

        <Paper
          elevation={2}
          sx={{
            p: 3,
            backgroundColor: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius,
          }}
        >
          <DateNavigator selectedDate={selectedDate} onDateChange={(date) => date && setSelectedDate(date)} />
        </Paper>

        {loading && (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {journal && !loading && (
          <Paper
            elevation={1}
            sx={{
              p: 3,
              backgroundColor: theme.palette.background.paper,
              borderRadius: theme.shape.borderRadius,
            }}
          >
            <Stack spacing={3}>
              <JournalHeader
                customName={journal.customName}
                isReadOnly={journal.isReadOnly}
                onNameChange={handleNameChange}
              />
              <JournalList
                tasks={journal.tasks}
                isReadOnly={journal.isReadOnly}
                onTaskToggle={handleTaskToggle}
              />
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default JournalPage;