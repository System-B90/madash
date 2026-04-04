'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useSnackbar } from 'notistack';
import { MessageHandlerType } from '@/components/session-ws';
import { MessageTypes } from '../session-common';
import { CalledToHadasEntityType, ResolvableStudent, StudentData } from '@/api-shared/types';
import { useAuth } from '@/components/auth-provider';
import { apiGetClasses, apiGetStudents } from '@/api-client/hive';
import { enqueueApiErrorSnackbar } from '@/api-client/common';
import { Room, Class, ClassTypeEnum, CourseUser } from '@/api-shared/hive-types';

export type StudentsContextState = {
    isLoading: boolean;
    students: Array<StudentData>;
    rooms: Array<Room>;
    getStudent: (studentResolveableData: ResolvableStudent | number) => StudentData | undefined;
};

const StudentsContext = createContext<StudentsContextState | undefined>(undefined);

export const StudentsProvider = ({ children }: { children: React.ReactNode; }) =>
{
    const [ rawStudents, setRawStudents ] = useState<Array<CourseUser>>([]);
    const [ classes, setClasses ] = useState<Array<Class>>([]);

    const [ isClassesLoading, setIsClassesLoading ] = useState<boolean>(true);
    const [ isStudentsLoading, setIsStudentsLoading ] = useState<boolean>(true);

    const { addMessageHandler } = useAuth();
    const { enqueueSnackbar } = useSnackbar();

    const fetchClasses = useCallback(async () =>
    {
        return apiGetClasses()
            .then(setClasses)
            .catch((error) => enqueueApiErrorSnackbar(enqueueSnackbar, 'טעינת מידע על כיתות נכשלה!', error))
            .finally(() => setIsClassesLoading(false));
    }, [ enqueueSnackbar ]);

    const fetchRawStudents = useCallback(async () =>
    {
        return apiGetStudents()
            .then(setRawStudents)
            .catch((error) => enqueueApiErrorSnackbar(enqueueSnackbar, 'טעינת מידע על חניכים נכשלה!', error))
            .finally(() => setIsStudentsLoading(false));
    }, [ enqueueSnackbar ]);

    const onWebSocketMessage: MessageHandlerType = useCallback((messageType: MessageTypes) =>
    {
        if (messageType === MessageTypes.SHUFFLE_MOVE)
        {
            setIsClassesLoading(true);
            setIsStudentsLoading(true);
            fetchRawStudents();
            fetchClasses();
        }
    }, [ fetchRawStudents, fetchClasses ]);

    useEffect(() =>
    {
        return addMessageHandler(onWebSocketMessage);
    }, [ addMessageHandler, onWebSocketMessage ]);

    useEffect(() =>
    {
        fetchClasses();
        fetchRawStudents();
    }, [ fetchClasses, fetchRawStudents ]);

    const isLoading = isClassesLoading || isStudentsLoading;

    const rooms = useMemo(() =>
    {
        return classes.filter((classItem) => classItem.type === ClassTypeEnum.Room) as Array<Room>;
    }, [ classes ]);

    const students = useMemo(() =>
    {
        return rawStudents.map((student): StudentData =>
        {
            const studentRoom = classes.find((classItem) =>
                classItem.type === ClassTypeEnum.Room && classItem.users.includes(student.id)
            );

            return {
                hiveId: student.id,
                name: student.display_name,
                room: studentRoom ? studentRoom.name : 'Unknown',
                bisId: student.number as number,
                type: CalledToHadasEntityType.Student,
            };
        });
    }, [ rawStudents, classes ]);

    const getStudent = useCallback((studentResolveableData: ResolvableStudent | number): StudentData | undefined =>
    {
        const hiveId = typeof studentResolveableData === 'number' ? studentResolveableData : studentResolveableData.hiveId;
        return students.find((student) => student.hiveId === hiveId);
    }, [ students ]);

    const contextValue = useMemo<StudentsContextState>(() => ({
        isLoading,
        students,
        rooms,
        getStudent,
    }), [ isLoading, students, rooms, getStudent ]);

    return (
        <StudentsContext.Provider value={ contextValue }>
            { children }
        </StudentsContext.Provider>
    );
};

export const useStudents = (): StudentsContextState =>
{
    const context = useContext(StudentsContext);

    if (context === undefined)
    {
        throw new Error('useStudents must be used within a StudentsProvider');
    }

    return context;
};
