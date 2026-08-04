"use client";
import { CommandPaletteProvider } from "@system-b90/command-palette";
import { ReactNode } from "react";

import { PALETTE_LABELS } from "@/components/app-commands/labels";
import { useAppearanceCommands } from "@/components/app-commands/use-appearance-commands";
import { useNavigationCommands } from "@/components/app-commands/use-navigation-commands";
import { useSessionCommands } from "@/components/app-commands/use-session-commands";

/** Registers the commands that are available from anywhere in the app. */
function AppCommands(): null
{
    useNavigationCommands();
    useAppearanceCommands();
    useSessionCommands();

    return null;
}

/**
 * Madash's palette. Wraps the generic package with this app's copy and its
 * app-wide commands.
 *
 * Mounted in the post-auth layout: inside `AuthProvider` and the theme
 * provider, which the app-wide commands read from, and outside every page, so
 * page-scoped contributors (see `StudentCommands`) are within it.
 */
export function MadashCommandPalette({ children }: { children: ReactNode; })
{
    return (
        <CommandPaletteProvider labels={ PALETTE_LABELS } storageNamespace="madash">
            <AppCommands />
            { children }
        </CommandPaletteProvider>
    );
}
