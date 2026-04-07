'use client';
import { CalledEntitiesProvider } from "@/components/called-students-provider";
import MadratMessageBox from "@/components/madrat-message-box";
import SideBar from "@/components/side-bar";
import { StudentsProvider } from "@/components/students-provider";
import SystemStatusBoard from "@/components/system-status-board";
import { Box } from "@mui/material";

export default function Home()
{
    return (
        <div className="flex flex-row w-full h-full box-border">
            <StudentsProvider>
                <CalledEntitiesProvider>
                    <SideBar />
                </CalledEntitiesProvider>
            </StudentsProvider>
            <Box
                className='w-full gap-4 flex-col flex px-2 py-4'
            >
                <SystemStatusBoard />
                <MadratMessageBox />
            </Box>
        </div>
    );
}
