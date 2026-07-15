import { WebSocketServer } from 'ws';
import { WEBSOCKET_SESSION_SERVER_PORT, MessageTypes, WEBSOCKET_SESSION_SERVER_SENDER_SERVER_MAGIC } from './session-common';
import { registerSession, registerSyncObjectConnection, handleServerMessage, abandonedSessionsGC } from './session-dispatch';

const GC_INTERVAL_MS = 3600 * 1000; // One hour

console.log(`WEBSOCKET_SESSION_SERVER_PORT: ${WEBSOCKET_SESSION_SERVER_PORT}`);
const wss = new WebSocketServer({
    port: 28199, // WEBSOCKET_SESSION_SERVER_PORT,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 50, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
    }
});

wss.on('connection', (ws) =>
{
    console.log(`[WebSocket] : New connection!`);
    ws.on('error', () => console.error('[WebSocket] : connection error!'));

    ws.on('message', (dataString) =>
    {
        console.log(`[WebSocket] : Data: ${dataString}`);

        const data = JSON.parse(dataString.toString());

        if (data[ 'sender' ] === WEBSOCKET_SESSION_SERVER_SENDER_SERVER_MAGIC)
        {
            handleServerMessage(data);
        }

        if (data[ 'type' ] === MessageTypes.REGISTER_SESSION)
        {
            registerSession(ws, data[ 'initiatorKey' ]);
            return;
        }
        else if (data[ 'type' ] === MessageTypes.REGISTER_SYNC_PROVIDER)
        {
            registerSyncObjectConnection(ws, data[ 'syncObjectId' ]);
            return;
        }
    });
});

setInterval(abandonedSessionsGC, GC_INTERVAL_MS);

export default wss;
