import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { COMBO_DATA_KEY, MessageTypes } from "../../session-server/session-common";
import assert from "assert";
import { useWebSocketConfig } from "@/components/websocket-config-provider";

export type MessageHandlerType = (messageType: MessageTypes, messageTarget: string, data: any) => void;
const MessageHandlerContext = createContext<MessageHandlerType>(() => { });

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 30_000;

export default function useSessionWebSocketContext()
{
    const { connectionString } = useWebSocketConfig();

    const ws = useRef<WebSocket | null>(null);
    const messageHandlers = useRef<MessageHandlerType[]>([]);
    const messageQueue = useRef<Record<string, unknown>[]>([]);
    const reconnectAttempt = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted = useRef(true);
    const connectRef = useRef<() => void>(() => {});

    const addMessageHandler = useCallback((handler: MessageHandlerType) =>
    {
        if (typeof window === 'undefined') return () => { };

        messageHandlers.current.push(handler);

        return () =>
        {
            messageHandlers.current = messageHandlers.current.filter(h => h !== handler);
        };
    }, []);

    const webSocketMessageHandler = useCallback((ev: MessageEvent<any>) =>
    {
        const data = JSON.parse(ev.data);
        const { type, target }: { type: MessageTypes, target: string; } = data;

        console.log(`[WS] Message type: ${type}`);

        if (type === MessageTypes.COMBO)
        {
            const comboData: MessageTypes[] = data[ COMBO_DATA_KEY ];
            assert(comboData !== undefined);

            messageHandlers.current.forEach(handler =>
                comboData.forEach(comboDataMessageType =>
                    handler(comboDataMessageType, target, data)
                )
            );
        } else
        {
            messageHandlers.current.forEach(handler => handler(type, target, data));
        }
    }, []);

    const registerCurrentSession = useCallback((socket: WebSocket) =>
    {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        socket.send(JSON.stringify({
            type: MessageTypes.REGISTER_SESSION,
            initiatorKey: crypto.randomUUID()
        }));
    }, []);

    const connect = useCallback(async () =>
    {
        if (!isMounted.current) return;

        const socket = new WebSocket(connectionString);
        ws.current = socket;

        socket.onopen = () =>
        {
            reconnectAttempt.current = 0;
            registerCurrentSession(socket);
            while (messageQueue.current.length > 0)
            {
                const msg = messageQueue.current.shift();
                if (msg) socket.send(JSON.stringify(msg));
            }
        };

        socket.onmessage = webSocketMessageHandler;

        socket.onclose = () =>
        {
            ws.current = null;
            if (!isMounted.current) return;
            const delay = Math.min(
                RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt.current),
                RECONNECT_MAX_MS
            );
            reconnectAttempt.current += 1;
            reconnectTimer.current = setTimeout(
                () => connectRef.current(),
                delay
            );
        };

        socket.onerror = () =>
        {
            console.error("[WS] Connection error");
            socket.close();
        };
    }, [ connectionString, webSocketMessageHandler, registerCurrentSession ]);

    useEffect(() =>
    {
        connectRef.current = connect;
        isMounted.current = true;
        void connect();

        return () =>
        {
            isMounted.current = false;
            if (reconnectTimer.current !== null)
            {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
            }
            if (ws.current)
            {
                ws.current.onclose = null;
                ws.current.onerror = null;
                ws.current.close();
                ws.current = null;
            }
        };
    }, [ connect ]);

    const sendMessage = useCallback((data: Record<string, unknown>) =>
    {
        const socket = ws.current;
        if (socket && socket.readyState === WebSocket.OPEN)
        {
            socket.send(JSON.stringify(data));
        } else if (socket && socket.readyState === WebSocket.CONNECTING)
        {
            messageQueue.current.push(data);
        } else
        {
            console.error("WebSocket is closed. Cannot send message.");
        }
    }, []);

    return { ws, addMessageHandler, sendMessage };
}

export const useMessageHandler = () =>
{
    return useContext(MessageHandlerContext);
};