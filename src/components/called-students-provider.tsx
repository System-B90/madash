'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
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
import { MessageTypes } from '../session-server/session-common';

export type CalledEntitiesContextState = {
    students: Array<StudentToHadasData>;
    groups: Array<GroupToHadasData>;
};

const CalledEntitiesContext = createContext<CalledEntitiesContextState | undefined>(undefined);

export const CalledEntitiesProvider = ({ children }: { children: React.ReactNode; }) =>
{
    const [ entitiesData, setEntitiesData ] = useState<Data[ 'calledToHadas' ]>({});

    const { addMessageHandler } = useAuth();
    const { getStudent } = useStudents();
    const { enqueueSnackbar } = useSnackbar();

    const loadStudentsCalledToHadas = useCallback(() =>
    {
        apiGetStudentsCalledToHadas()
            .then(setEntitiesData)
            .catch((error) => enqueueApiErrorSnackbar(enqueueSnackbar, `טעינת החניכים שצריכים להגיע לחד"ס נכשלה!`, error));
    }, [ setEntitiesData, enqueueSnackbar ]);

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

        Object.values(entitiesData).forEach((entityToHadasData) =>
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
    }, [ entitiesData ]);

    return (
        <CalledEntitiesContext.Provider value={ { students, groups } }>
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