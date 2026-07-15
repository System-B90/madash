import { Box, Typography, useTheme } from '@mui/material';
import React from 'react';

import { Task } from '@/api-shared/journal';
import TaskItem from '@/components/journal/TaskItem';

interface JournalListProps {
  tasks: Task[];
  isReadOnly: boolean;
  onTaskToggle: (taskId: string) => void;
}

const JournalList: React.FC<JournalListProps> = ({ tasks, isReadOnly, onTaskToggle }) => {
  const theme = useTheme();

  if (tasks.length === 0) {
    return (
      <Typography
        variant="body1"
        sx={{
          textAlign: 'center',
          py: 2,
          color: theme.palette.text.secondary,
        }}
      >
        אין משימות ביום זה
      </Typography>
    );
  }

  return (
    <Box>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isReadOnly={isReadOnly}
          onToggle={onTaskToggle}
        />
      ))}
    </Box>
  );
};

export default JournalList;