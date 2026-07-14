// api-shared/journal.ts
export interface Task {
  id: string;
  title: string;
  description?: string;
  scheduledTime: string; // e.g., "08:00"
  dayOfWeek: number; // 0-6, Sunday=0
  isCompleted: boolean;
  type: 'administrative' | 'assignment';
  completedAtTimestamp?: string; // ISO string
}

export interface Journal {
  id: string;
  date: string; // ISO date string, e.g., "2023-10-01"
  customName: string;
  tasks: Task[];
  isReadOnly: boolean;
}