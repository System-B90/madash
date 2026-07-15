import { useSnackbar } from 'notistack';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react';

import { enqueueApiErrorSnackbar } from '@/api-client/common';
import { apiGetClasses, apiGetStudents } from '@/api-client/hive';
import { Room, Class, ClassTypeEnum, CourseUser } from '@/api-shared/hive-types';
import { CalledToHadasEntityType, ResolvableStudent, StudentData } from '@/api-shared/types';
import { useAuth } from '@/components/auth-provider';
import { MessageHandlerType } from '@/components/session-ws';
import { MessageTypes } from '@/settings';

export type StudentsContextState = {
    isLoading: boolean;
    students: Array<StudentData>;
    rooms: Array<Room>;
    getStudent: (studentResolveableData: ResolvableStudent | number) => StudentData | undefined;
};

export type StudentsState = {
    rawStudents: Array<CourseUser>;
    classes: Array<Class>;
    isClassesLoading: boolean;
    isStudentsLoading: boolean;
};

export type StudentsAction =
    | { type: 'SET_RAW_STUDENTS'; payload: Array<CourseUser> }
    | { type: 'SET_CLASSES'; payload: Array<Class> }
    | { type: 'SET_CLASSES_LOADING'; payload: boolean }
    | { type: 'SET_STUDENTS_LOADING'; payload: boolean }
    | { type: 'START_REFRESH' };

export function studentsReducer(state: StudentsState, action: StudentsAction): StudentsState
{
    switch (action.type)
    {
        case 'SET_RAW_STUDENTS':
            return { ...state, rawStudents: action.payload, isStudentsLoading: false };
        case 'SET_CLASSES':
            return { ...state, classes: action.payload, isClassesLoading: false };
        case 'SET_CLASSES_LOADING':
            return { ...state, isClassesLoading: action.payload };
        case 'SET_STUDENTS_LOADING':
            return { ...state, isStudentsLoading: action.payload };
        case 'START_REFRESH':
            return { ...state, isClassesLoading: true, isStudentsLoading: true };
        default:
            return state;
    }
}

const StudentsContext = createContext<StudentsContextState | undefined>(undefined);

export const StudentsProvider = ({ children }: { children: React.ReactNode; }) =>
{
    const [ state, dispatch ] = useReducer(studentsReducer, {
        rawStudents: [],
        classes: [],
        isClassesLoading: true,
        isStudentsLoading: true,
    });

    const { addMessageHandler } = useAuth();
    const { enqueueSnackbar } = useSnackbar();

    const fetchClasses = useCallback(async () =>
    {
        dispatch({ type: 'SET_CLASSES_LOADING', payload: true });
        return apiGetClasses()
            .then((data) => dispatch({ type: 'SET_CLASSES', payload: data }))
            .catch((error) => {
                dispatch({ type: 'SET_CLASSES_LOADING', payload: false });
                enqueueApiErrorSnackbar(enqueueSnackbar, 'טעינת מידע על כיתות נכשלה!', error);
            });
    }, [ enqueueSnackbar ]);

    const fetchRawStudents = useCallback(async () =>
    {
        dispatch({ type: 'SET_STUDENTS_LOADING', payload: true });
        return apiGetStudents()
            .then((data) => dispatch({ type: 'SET_RAW_STUDENTS', payload: data }))
            .catch((error) => {
                dispatch({ type: 'SET_STUDENTS_LOADING', payload: false });
                enqueueApiErrorSnackbar(enqueueSnackbar, 'טעינת מידע על חניכים נכשלה!', error);
            });
    }, [ enqueueSnackbar ]);

    const onWebSocketMessage: MessageHandlerType = useCallback((messageType: MessageTypes) =>
    {
        if (messageType === MessageTypes.SHUFFLE_MOVE)
        {
            dispatch({ type: 'START_REFRESH' });
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

    const isLoading = state.isClassesLoading || state.isStudentsLoading;

    const rooms = useMemo(() =>
    {
        return state.classes.filter((classItem) => classItem.type === ClassTypeEnum.Room) as Array<Room>;
    }, [ state.classes ]);

    const students = useMemo(() =>
    {
        const userIdToRoomName = new Map<number, string>();
        state.classes.forEach((classItem) =>
        {
            if (classItem.type === ClassTypeEnum.Room)
            {
                classItem.users.forEach((userId) =>
                {
                    userIdToRoomName.set(userId, classItem.name);
                });
            }
        });

        return state.rawStudents.map((student): StudentData =>
        {
            const roomName = userIdToRoomName.get(student.id) ?? 'Unknown';

            return {
                hiveId: student.id,
                name: student.display_name,
                room: roomName,
                bisId: student.number as number,
                type: CalledToHadasEntityType.Student,
            };
        });
    }, [ state.rawStudents, state.classes ]);

    const studentMap = useMemo(() =>
    {
        const map = new Map<number, StudentData>();
        students.forEach((student) =>
        {
            map.set(student.hiveId, student);
        });
        return map;
    }, [ students ]);

    const getStudent = useCallback((studentResolveableData: ResolvableStudent | number): StudentData | undefined =>
    {
        const hiveId = typeof studentResolveableData === 'number' ? studentResolveableData : studentResolveableData.hiveId;
        return studentMap.get(hiveId);
    }, [ studentMap ]);

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
