'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    useRef
} from 'react';
import useSessionWebSocketContext, { MessageHandlerType } from '@/components/session-ws';
import { MessageTypes } from '../session-common';
import { AuthSessionUser } from '@/api-shared/session';

export interface WebSocketSessionMessage
{
    type: MessageTypes;
    [ key: string ]: unknown;
}

export type AuthContextState = {
    userData: AuthSessionUser;
    canEdit: boolean;
    addMessageHandler: (handler: MessageHandlerType) => () => void;
    sendMessage: (data: WebSocketSessionMessage) => void;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider = ({ children, userData }: { children: React.ReactNode; userData: AuthSessionUser; }) =>
{
    const [ canEdit, setCanEdit ] = useState<boolean>(true);
    const { ws, addMessageHandler } = useSessionWebSocketContext();
    const messageQueue = useRef<WebSocketSessionMessage[]>([]);

    const onWebSocketMessage: MessageHandlerType = useCallback((messageType: MessageTypes, data: unknown) =>
    {
        console.log(`[onWebSocketMessage] ${messageType}`, data);
    }, []);

    useEffect(() =>
    {
        return addMessageHandler(onWebSocketMessage);
    }, [ addMessageHandler, onWebSocketMessage ]);

    const sendMessage = useCallback((data: WebSocketSessionMessage) =>
    {
        if (!ws?.current) return;

        if (ws.current.readyState === WebSocket.OPEN)
        {
            ws.current.send(JSON.stringify(data));
        } else if (ws.current.readyState === WebSocket.CONNECTING)
        {
            messageQueue.current.push(data);
        } else
        {
            console.error('WebSocket is closed. Cannot send message.');
        }
    }, [ ws ]);

    useEffect(() =>
    {
        if (!ws?.current) return;

        const socketInstance = ws.current;

        const handleSocketOpen = () =>
        {
            while (messageQueue.current.length > 0)
            {
                const msg = messageQueue.current.shift();
                if (msg) socketInstance.send(JSON.stringify(msg));
            }
        };

        socketInstance.addEventListener('open', handleSocketOpen);

        return () =>
        {
            socketInstance.removeEventListener('open', handleSocketOpen);
        };
    }, [ ws ]);

    useEffect(() =>
    {
        setCanEdit(!!userData);
    }, [ userData ]);

    return (
        <AuthContext.Provider value={ {
            userData,
            canEdit,
            addMessageHandler,
            sendMessage,
        } }>
            { children }
        </AuthContext.Provider>
    );
};

export const useAuth = () =>
{
    const context = useContext(AuthContext);

    if (context === undefined)
    {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};