'use client';

import { useMemo } from 'react';

import { apiGetStaff } from '@/api-client/hive';
import { buildMentionDirectory, type MentionDirectory, type StaffMember } from '@/api-shared/mentions';
import { useStudents } from '@/components/students-provider';
import { usePolling } from '@/components/system-status-board/use-polling';

/** Staff status (present / home / …) changes during the day; the roster itself refreshes on SHUFFLE_MOVE. */
const STAFF_POLL_MS = 60_000;
const NO_STAFF: StaffMember[] = [];

/** Everything taggable in the madrat message, built from the live Hive roster. */
export function useMentionDirectory(): MentionDirectory
{
    const { rawStudents, classes } = useStudents();
    const staff = usePolling(apiGetStaff, STAFF_POLL_MS, () => NO_STAFF) ?? NO_STAFF;
    return useMemo(() => buildMentionDirectory({ students: rawStudents, classes, staff }), [ rawStudents, classes, staff ]);
}
