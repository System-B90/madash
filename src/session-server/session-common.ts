import assert from 'assert';

export const NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT = parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT ?? '443', 10);

export const NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST = process.env.NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST ?? '127.0.0.1';

export const SECURE_CONTEXT_ONLY = process.env.NODE_ENV === 'production' || NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT === 443;

const protocol = SECURE_CONTEXT_ONLY ? 'wss' : 'ws';

const portSuffix = (NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT === 443 || NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT === 80)
    ? ''
    : `:${NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT}`;

export const NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_CONN_STRING = `${protocol}://${NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST}${portSuffix}/ws/`;
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