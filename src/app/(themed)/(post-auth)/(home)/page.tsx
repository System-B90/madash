'use client';
import { CalledEntitiesProvider } from "@/components/called-students-provider";
import MadratMessageBox from "@/components/madrat-message-box";
import SideBar from "@/components/side-bar";
import { StudentsProvider } from "@/components/students-provider";

export default function Home()
{
    return (
        <div className="flex flex-row w-full h-full box-border">
            <StudentsProvider>
                <CalledEntitiesProvider>
                    <SideBar />
                </CalledEntitiesProvider>
            </StudentsProvider>
            <MadratMessageBox />
        </div>
    );
}
