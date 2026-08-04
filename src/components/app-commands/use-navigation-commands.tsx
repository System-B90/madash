"use client";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useCommands } from "@system-b90/command-palette";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo } from "react";

import { COMMAND_GROUPS } from "@/components/app-commands/labels";

type Destination = {
    id: string;
    title: string;
    href: string;
    icon: ReactNode;
    keywords: Array<string>;
};

const DESTINATIONS: Array<Destination> = [
    {
        id: "goto.home",
        title: "לוח מצב",
        href: "/",
        icon: <DashboardIcon />,
        keywords: [ "dashboard", "home", "status", "לוח", "בית", "סטטוס" ],
    },
    {
        id: "goto.journal",
        title: "יומן",
        href: "/journal",
        icon: <MenuBookIcon />,
        keywords: [ "journal", "log", "diary", "יומן", "לוג" ],
    },
];

/** Top-level page navigation. Registered app-wide. */
export function useNavigationCommands(): void
{
    const router = useRouter();
    const pathname = usePathname();

    const commands = useMemo(
        () =>
            DESTINATIONS.map((destination) => ({
                id: destination.id,
                title: `מעבר אל ${destination.title}`,
                subtitle: destination.href,
                group: COMMAND_GROUPS.navigation,
                kind: "goto" as const,
                icon: destination.icon,
                keywords: destination.keywords,
                // Already here — show it, but don't pretend it does anything.
                enabled: pathname !== destination.href,
                run: () => router.push(destination.href),
            })),
        [ router, pathname ],
    );

    useCommands(commands);
}
