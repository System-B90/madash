"use client";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import { Command, CommandQuery, useCommands } from "@system-b90/command-palette";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import { useCallback, useMemo } from "react";

import { apiCallStudentToHadas } from "@/api-client/call-to-hadas";
import { enqueueApiErrorSnackbar } from "@/api-client/common";
import { CalledToHadasEntityType, StudentData } from "@/api-shared/types";
import { COMMAND_GROUPS } from "@/components/app-commands/labels";
import { useStudents } from "@/components/students-provider";

/**
 * How long a call raised from the palette stays live. The sidebar form lets you
 * pick a time; the palette deliberately does not, because a one-keystroke path
 * that also opens a time picker is not a one-keystroke path. An hour matches
 * what the form is used for in practice, and the call can be cleared from the
 * board like any other.
 */
const DEFAULT_CALL_MINUTES = 60;

/**
 * The roster is in the hundreds, so commands are contributed as a factory
 * rather than an array: the palette only materialises the students matching
 * what has actually been typed. Returning nothing for an empty query keeps the
 * default (no-query) list showing app commands rather than the entire school.
 */
function buildStudentCommands(
    students: Array<StudentData>,
    callToHadas: (student: StudentData) => void,
): Array<Command>
{
    return students.map((student) => ({
        id: `student.${student.hiveId}`,
        title: student.name,
        subtitle: student.room,
        group: COMMAND_GROUPS.hadas,
        kind: "entity" as const,
        icon: <PersonSearchIcon />,
        keywords: [ String(student.bisId), student.room ],
        run: () => callToHadas(student),
    }));
}

/**
 * Contributes one command per student ("call to Hadas").
 *
 * Page-scoped rather than app-wide: it reads `StudentsProvider`, which only the
 * dashboard mounts. Render it inside that provider.
 */
export function StudentCommands(): null
{
    const { students } = useStudents();
    const { enqueueSnackbar } = useSnackbar();

    const callToHadas = useCallback(
        (student: StudentData) =>
        {
            apiCallStudentToHadas({
                students: [ {
                    name: student.name,
                    hiveId: student.hiveId,
                    type: CalledToHadasEntityType.Student,
                } ],
                reason: "",
                expirationTime: dayjs().add(DEFAULT_CALL_MINUTES, "minute"),
                groupCall: false,
            })
                .then((message) => enqueueSnackbar(message, { variant: "success" }))
                .catch((error) =>
                    enqueueApiErrorSnackbar(enqueueSnackbar, "הקריאה נכשלה!", error));
        },
        [ enqueueSnackbar ],
    );

    const source = useCallback(
        (query: CommandQuery) =>
            query.text.trim().length === 0
                ? []
                : buildStudentCommands(students, callToHadas),
        [ students, callToHadas ],
    );

    useCommands(source);

    return null;
}
