"use client";
import CampaignIcon from "@mui/icons-material/Campaign";
import CancelIcon from "@mui/icons-material/Cancel";
import { Command, CommandQuery, useCommands } from "@system-b90/command-palette";
import { useSnackbar } from "notistack";
import { useCallback } from "react";

import { apiRemoveStudentCallToHadas, apiUpdateStateStudentCallToHadas } from "@/api-client/call-to-hadas";
import { enqueueApiErrorSnackbar } from "@/api-client/common";
import { StudentToHadasData } from "@/api-shared/types";
import { COMMAND_GROUPS } from "@/components/app-commands/labels";
import { useCalledEntities } from "@/components/called-students-provider";

export const MARK_TOLD = "סמן שנמסר";
export const CANCEL_CALL = "בטל קריאה";

type CallActions = {
    markTold: (call: StudentToHadasData) => void;
    cancel: (call: StudentToHadasData) => void;
};

/**
 * One command per action on each open call, mirroring the board's click flow
 * (requested -> told -> removed): "mark told" while the call is still
 * requested, "cancel" in either state. Searchable by the student's name and by
 * the action's words, so "דנה סמן" and "בטל" both find it.
 */
export function buildCalledStudentCommands(
    calls: Array<StudentToHadasData>,
    actions: CallActions,
): Array<Command>
{
    return calls.flatMap((call) =>
    {
        const name = call.student.name;
        const commands: Array<Command> = [];
        if (call.state === "requested")
        {
            commands.push({
                id: `call.${call.callId}.told`,
                title: `${MARK_TOLD}: ${name}`,
                subtitle: call.reason || undefined,
                group: COMMAND_GROUPS.hadas,
                icon: <CampaignIcon />,
                keywords: [ name, MARK_TOLD, "told" ],
                run: () => actions.markTold(call),
            });
        }
        commands.push({
            id: `call.${call.callId}.cancel`,
            title: `${CANCEL_CALL}: ${name}`,
            subtitle: call.reason || undefined,
            group: COMMAND_GROUPS.hadas,
            icon: <CancelIcon />,
            keywords: [ name, CANCEL_CALL, "cancel" ],
            run: () => actions.cancel(call),
        });
        return commands;
    });
}

/**
 * Contributes state commands for students currently called to Hadas (#53).
 * Render inside `CalledEntitiesProvider`.
 */
export function CalledStudentCommands(): null
{
    const { students: calls } = useCalledEntities();
    const { enqueueSnackbar } = useSnackbar();

    const markTold = useCallback((call: StudentToHadasData) =>
    {
        apiUpdateStateStudentCallToHadas({ callId: call.callId, state: "told" })
            .then(() => enqueueSnackbar(`${call.student.name}: נמסר`, { variant: "success" }))
            .catch((error) => enqueueApiErrorSnackbar(enqueueSnackbar, "עדכון הקריאה נכשל!", error));
    }, [ enqueueSnackbar ]);

    const cancel = useCallback((call: StudentToHadasData) =>
    {
        apiRemoveStudentCallToHadas({ callId: call.callId })
            .then(() => enqueueSnackbar(`הקריאה ל${call.student.name} בוטלה`, { variant: "success" }))
            .catch((error) => enqueueApiErrorSnackbar(enqueueSnackbar, "ביטול הקריאה נכשל!", error));
    }, [ enqueueSnackbar ]);

    const source = useCallback(
        (query: CommandQuery) =>
            query.text.trim().length === 0
                ? []
                : buildCalledStudentCommands(calls, { markTold, cancel }),
        [ calls, markTold, cancel ],
    );

    useCommands(source);

    return null;
}
