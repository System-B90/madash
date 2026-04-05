import CallStudentToHadas from "@/components/call-student-to-hadas";
import CalledToHadas from "@/components/called-to-hadas";
import UserAccessBar from "@/components/user-access-bar";
import { Box } from "@mui/material";

export default function SideBar()
{

    return (
        <Box className="flex flex-col h-full w-[20%] min-w-80 space-y-2 px-2 py-4">
            <UserAccessBar />
            <CallStudentToHadas />
            <CalledToHadas />
        </Box>
    );
};
