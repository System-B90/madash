import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react';

import { apiGetStudentsCalledToHadas } from '@/api-client/call-to-hadas';
import { enqueueApiErrorSnackbar } from '@/api-client/common';
import
{
    CalledToHadasData,
    CalledToHadasEntityType,
    Data,
    GroupToHadasData,
    StudentData,
    StudentToHadasData
} from '@/api-shared/types';
import { useAuth } from '@/components/auth-provider';
import { MessageHandlerType } from '@/components/session-ws';
import { useStudents } from '@/components/students-provider';
import { MessageTypes } from '@/settings';

export type CalledEntitiesContextState = {
    students: Array<StudentToHadasData>;
    groups: Array<GroupToHadasData>;
    isLoading: boolean;
};

export type CalledEntitiesState = {
    entitiesData: Data[ 'calledToHadas' ];
    isLoading: boolean;
};

export type CalledEntitiesAction =
    | { type: 'SET_ENTITIES'; payload: Data[ 'calledToHadas' ] }
    | { type: 'SET_LOADING'; payload: boolean };

export function calledEntitiesReducer(state: CalledEntitiesState, action: CalledEntitiesAction): CalledEntitiesState
{
    switch (action.type)
    {
        case 'SET_ENTITIES':
            return { ...state, entitiesData: action.payload, isLoading: false };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        default:
            return state;
    }
}

const CalledEntitiesContext = createContext<CalledEntitiesContextState | undefined>(undefined);

export const CalledEntitiesProvider = ({ children }: { children: React.ReactNode; }) =>
{
    const [ state, dispatch ] = useReducer(calledEntitiesReducer, {
        entitiesData: {},
        isLoading: true,
    });

    const { addMessageHandler } = useAuth();
    const { getStudent } = useStudents();
    const { enqueueSnackbar } = useSnackbar();

    const loadStudentsCalledToHadas = useCallback(() =>
    {
        dispatch({ type: 'SET_LOADING', payload: true });
        apiGetStudentsCalledToHadas()
            .then((data) => dispatch({ type: 'SET_ENTITIES', payload: data }))
            .catch((error) => {
                dispatch({ type: 'SET_LOADING', payload: false });
                enqueueApiErrorSnackbar(enqueueSnackbar, `טעינת החניכים שצריכים להגיע לחד"ס נכשלה!`, error);
            });
    }, [ enqueueSnackbar ]);

    const onWebSocketMessage: MessageHandlerType = useCallback((messageType: MessageTypes) =>
    {
        if (messageType === MessageTypes.STUDENTS_TO_HADAS_UPDATE)
        {
            loadStudentsCalledToHadas();
        }
    }, [ loadStudentsCalledToHadas ]);

    useEffect(() =>
    {
        return addMessageHandler(onWebSocketMessage);
    }, [ addMessageHandler, onWebSocketMessage ]);

    useEffect(() =>
    {
        loadStudentsCalledToHadas();
    }, [ loadStudentsCalledToHadas ]);

    const { students, groups } = useMemo(() =>
    {
        const parsedStudents: Array<StudentToHadasData> = [];
        const parsedGroups: Array<GroupToHadasData> = [];

        Object.values(state.entitiesData).forEach((entityToHadasData) =>
        {
            if (entityToHadasData.type === CalledToHadasEntityType.Student)
            {
                parsedStudents.push({
                    ...entityToHadasData,
                    expirationTime: dayjs(entityToHadasData.expirationTime)
                }
                );
            }
            else if (entityToHadasData.type === CalledToHadasEntityType.Group)
            {
                parsedGroups.push({
                    ...entityToHadasData,
                    expirationTime: dayjs(entityToHadasData.expirationTime)
                });
            }
        });

        return { students: parsedStudents, groups: parsedGroups };
    }, [ state.entitiesData ]);

    return (
        <CalledEntitiesContext.Provider value={ { students, groups, isLoading: state.isLoading } }>
            { children }
        </CalledEntitiesContext.Provider>
    );
};

export const useCalledEntities = () =>
{
    const context = useContext(CalledEntitiesContext);

    if (context === undefined)
    {
        throw new Error('useCalledEntities must be used within a CalledEntitiesProvider');
    }

    return context;
};