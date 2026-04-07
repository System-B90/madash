import assert from 'assert';

export const SECURE_CONTEXT_ONLY = false; //process.env.NODE_ENV !== 'development' && (!process.env.HTTP_ONLY);
export const NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT = parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT ?? '8089');
export const NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST = process.env.NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST;
export const NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_CONN_STRING = `${SECURE_CONTEXT_ONLY ? 'wss' : 'ws'}://${NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST}:${NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT}/`;

export const WEBSOCKET_SESSION_SERVER_SENDER_SERVER_MAGIC = 'server';
export const WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY = process.env.WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY;
// Currently no assert since this executes on the client for some reason as well
assert(WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY || (typeof window !== 'undefined'), `WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY must be set in environment variables!`);

export enum MessageTypes 
{
    REGISTER_SESSION = 'register-session',
    MADRAT_TEXT_UPDATE = 'madrat-text-update', // Madrat altered the message text
    SHUFFLE_MOVE = 'shuffle-move', // Shuffles moved between classrooms
    STUDENTS_TO_HADAS_UPDATE = 'students-to-hadas-update', // A student was called to the Hadas or arrived at the Hadas
    REGISTER_SYNC_PROVIDER = 'register-sync-provider',
    SYNC_OBJECT_UPDATE = 'sync-object-update',
    DEREGISTER_SYNC_PROVIDER = 'deregister-sync-provider',
    COMBO = 'combo',
    PING = 'ping',
    PONG = 'pong',
};
export const COMBO_DATA_KEY = 'combo-data';