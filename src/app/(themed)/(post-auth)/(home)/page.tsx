'use client';
import { Box } from "@mui/material";

import { StudentCommands } from "@/components/app-commands/StudentCommands";
import { CalledEntitiesProvider } from "@/components/called-students-provider";
import MadratMessageBox from "@/components/madrat-message-box";
import SideBar from "@/components/side-bar";
import { StudentsProvider } from "@/components/students-provider";
import SystemStatusBoard from "@/components/system-status-board/index";

export default function Home()
{
    return (
        <StudentsProvider>
            { /* Inside StudentsProvider — the roster is what it contributes. */ }
            <StudentCommands />
            <div className="flex flex-row w-full h-full box-border">
                <CalledEntitiesProvider>
                    <SideBar />
                </CalledEntitiesProvider>
                <Box
                    className='w-full min-h-0 gap-4 flex-col flex px-2 py-4 h-full grow'
                >
                    <SystemStatusBoard />
                    <MadratMessageBox />
                </Box>
            </div>
        </StudentsProvider>
    );
}
