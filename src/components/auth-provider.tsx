'use client';

import { signOut } from "next-auth/react";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useMemo
} from 'react';

import { AuthSessionUser } from '@/api-shared/session';
import useSessionWebSocketContext, { MessageHandlerType } from '@/components/session-ws';
import { MessageTypes } from '@/settings';

export interface WebSocketSessionMessage
{
    type: MessageTypes;
    [ key: string ]: unknown;
}

export type AuthContextState = {
    userData: AuthSessionUser;
    logout: () => void;
    canEdit: boolean;
    addMessageHandler: (handler: MessageHandlerType) => () => void;
    sendMessage: (data: WebSocketSessionMessage) => void;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider = ({ children, userData }: { children: React.ReactNode; userData: AuthSessionUser; }) =>
{
    const { addMessageHandler, sendMessage } = useSessionWebSocketContext();

    const canEdit: boolean = !!userData;

    const onWebSocketMessage: MessageHandlerType = useCallback((messageType: MessageTypes, data: unknown) =>
    {
        console.log(`[onWebSocketMessage] ${messageType}`, data);
    }, []);

    useEffect(() =>
    {
        return addMessageHandler(onWebSocketMessage);
    }, [ addMessageHandler, onWebSocketMessage ]);

    const logout = useCallback(() =>
    {
        signOut({ callbackUrl: '/login' });
    }, []);


    const contextValue = useMemo<AuthContextState>(() => ({
        userData,
        logout,
        canEdit,
        addMessageHandler,
        sendMessage,
    }), [ logout, userData, canEdit, addMessageHandler, sendMessage ]);

    return (
        <AuthContext.Provider value={ contextValue }>
            { children }
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextState =>
{
    const context = useContext(AuthContext);

    if (context === undefined)
    {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};
