import
{
    MessageTypes,
    WEBSOCKET_SESSION_SERVER_SENDER_SERVER_MAGIC,
    WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY,
    NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_CONN_STRING
} from "@/settings";

const isServer = typeof window === 'undefined';
const TARGET_WS_URL = isServer ? 'ws://websocket:28199' : NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_CONN_STRING;

let sharedWs: WebSocket | null = null;
const messageQueue: Array<{ payload: string; resolve: () => void; reject: (error: any) => void; }> = [];

function getOrCreateWebSocket(): WebSocket
{
    if (sharedWs && (sharedWs.readyState === WebSocket.OPEN || sharedWs.readyState === WebSocket.CONNECTING))
    {
        return sharedWs;
    }

    sharedWs = new WebSocket(TARGET_WS_URL);

    sharedWs.onopen = () =>
    {
        while (messageQueue.length > 0)
        {
            const item = messageQueue.shift();
            if (item)
            {
                try
                {
                    sharedWs!.send(item.payload);
                    item.resolve();
                } catch (error)
                {
                    item.reject(error);
                }
            }
        }
    };

    sharedWs.onerror = (error) =>
    {
        while (messageQueue.length > 0)
        {
            const item = messageQueue.shift();
            item?.reject(error);
        }
        sharedWs = null;
    };

    sharedWs.onclose = () =>
    {
        sharedWs = null;
    };

    return sharedWs;
}

export async function SendServerRequestToSessionServer({ type, data, target }: { type: MessageTypes, data?: any, target?: string; }): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        try
        {
            const payload = JSON.stringify({
                sender: WEBSOCKET_SESSION_SERVER_SENDER_SERVER_MAGIC,
                authKey: WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY,
                type: type,
                targets: target,
                data,
            });

            const ws = getOrCreateWebSocket();

            if (ws.readyState === WebSocket.OPEN)
            {
                ws.send(payload);
                resolve();
            } else if (ws.readyState === WebSocket.CONNECTING)
            {
                messageQueue.push({ payload, resolve, reject });
            } else
            {
                reject(new Error("WebSocket is in an invalid state for sending."));
            }
        } catch (error)
        {
            reject(error);
        }
    });
}
