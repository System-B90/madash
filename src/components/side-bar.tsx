import { Box } from "@mui/material";

import { CommandPaletteButton } from "@/components/app-commands/CommandPaletteButton";
import CallStudentToHadas from "@/components/call-student-to-hadas";
import CalledToHadas from "@/components/called-to-hadas";
import { ThemeSelectorIcon } from "@/components/header/ThemeSelector";
import UserAccessBar from "@/components/user-access-bar";

export default function SideBar()
{
    return (
        <Box className="flex flex-col h-full w-[20%] min-w-80 space-y-2 px-2 py-4 border-l border-divider bg-background">
            <Box className="flex flex-row items-center justify-between gap-3 mb-4">
                <UserAccessBar />
                <Box className="flex-shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95">
                    <ThemeSelectorIcon />
                </Box>
            </Box>
            <CommandPaletteButton />
            <CallStudentToHadas />
            <CalledToHadas />
        </Box>
    );
};
