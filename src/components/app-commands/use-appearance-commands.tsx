"use client";
import ComputerIcon from "@mui/icons-material/Computer";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useCommands } from "@system-b90/command-palette";
import { ReactNode, useMemo } from "react";

import { COMMAND_GROUPS } from "@/components/app-commands/labels";
import { ThemeMode, useTheme } from "@/components/theme/ThemeProvider";

type ThemeChoice = {
    mode: ThemeMode;
    title: string;
    icon: ReactNode;
    keywords: Array<string>;
};

const THEME_CHOICES: Array<ThemeChoice> = [
    {
        mode: "light",
        title: "מצב בהיר",
        icon: <LightModeIcon />,
        keywords: [ "light", "theme", "בהיר", "ערכת נושא" ],
    },
    {
        mode: "dark",
        title: "מצב כהה",
        icon: <DarkModeIcon />,
        keywords: [ "dark", "theme", "night", "כהה", "לילה" ],
    },
    {
        mode: "system",
        title: "לפי הגדרות המערכת",
        icon: <ComputerIcon />,
        keywords: [ "system", "auto", "מערכת", "אוטומטי" ],
    },
];

/** Theme switching. Registered app-wide. */
export function useAppearanceCommands(): void
{
    const { theme, resolvedTheme, setTheme } = useTheme();

    const commands = useMemo(
        () => [
            // The toggle is what someone reaching for the palette almost always
            // wants; the explicit modes below exist for picking a specific one.
            {
                id: "appearance.toggle",
                title: resolvedTheme === "dark" ? "מעבר למצב בהיר" : "מעבר למצב כהה",
                group: COMMAND_GROUPS.appearance,
                icon: resolvedTheme === "dark" ? <LightModeIcon /> : <DarkModeIcon />,
                keywords: [ "theme", "toggle", "dark", "light", "ערכת נושא", "החלפה" ],
                priority: 1,
                run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
            },
            ...THEME_CHOICES.map((choice) => ({
                id: `appearance.${choice.mode}`,
                title: choice.title,
                group: COMMAND_GROUPS.appearance,
                icon: choice.icon,
                keywords: choice.keywords,
                enabled: theme !== choice.mode,
                run: () => setTheme(choice.mode),
            })),
        ],
        [ theme, resolvedTheme, setTheme ],
    );

    useCommands(commands);
}
