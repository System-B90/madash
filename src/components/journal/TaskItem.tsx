import { Box, Checkbox, Typography, Card, CardContent, useTheme } from '@mui/material';
import React from 'react';

import { Task } from '@/api-shared/journal';

interface TaskItemProps {
  task: Task;
  isReadOnly: boolean;
  onToggle: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isReadOnly, onToggle }) => {
  const theme = useTheme();

  const handleChange = () => {
    if (!isReadOnly) {
      onToggle(task.id);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1,
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center">
          <Checkbox
            checked={task.isCompleted}
            onChange={handleChange}
            disabled={isReadOnly}
          />
          <Box flexGrow={1}>
            <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>
              {task.title}
            </Typography>
            {task.description && (
              <Typography variant="body2" color="text.secondary">
                {task.description}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              שעה: {task.scheduledTime} | סוג: {task.type === 'administrative' ? 'ניהול' : 'עבודה'}
            </Typography>
            {task.isCompleted && task.completedAtTimestamp && (
              <Typography variant="body2" sx={{ color: theme.palette.success.main }}>
                הושלם ב: {new Date(task.completedAtTimestamp).toLocaleString('he-IL')}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskItem;