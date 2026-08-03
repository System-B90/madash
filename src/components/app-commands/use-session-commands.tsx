"use client";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useCommands } from "@system-b90/command-palette";
import { useMemo } from "react";

import { COMMAND_GROUPS } from "@/components/app-commands/labels";
import { useAuth } from "@/components/auth-provider";

/** Session-level actions. Registered app-wide. */
export function useSessionCommands(): void
{
    const { logout, userData } = useAuth();

    const commands = useMemo(
        () => [
            {
                id: "session.reload",
                title: "רענון הנתונים",
                subtitle: "טעינה מחדש של המסך",
                group: COMMAND_GROUPS.session,
                icon: <RefreshIcon />,
                keywords: [ "reload", "refresh", "רענון", "טעינה" ],
                run: () => globalThis.location.reload(),
            },
            {
                id: "session.logout",
                title: "התנתקות",
                subtitle: userData.name,
                group: COMMAND_GROUPS.session,
                icon: <LogoutIcon />,
                keywords: [ "logout", "sign out", "התנתקות", "יציאה" ],
                // Signing out by mistyping into a search box would be a nasty
                // surprise, so keep it off the no-query default list.
                priority: -1,
                run: logout,
            },
        ],
        [ logout, userData ],
    );

    useCommands(commands);
}
