import { WebSocket } from 'ws';
import assert from 'assert';
import { MessageTypes, WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY, COMBO_DATA_KEY } from './session-common';

export interface ConnectedSession
{
    ws: WebSocket;
    initiatorKey: string;
    abandonedMark?: boolean;
}

export type ConnectedSyncObjectSession = ConnectedSession;

export const connectedSessions: Array<ConnectedSession> = [];
export const registeredSyncObjectConnections: { [ x: string ]: Array<ConnectedSyncObjectSession>; } = {};

export function updateSessionLastContact<T extends ConnectedSession>(session: T)
{
    session.abandonedMark = false;
}

export function registerSession(ws: WebSocket, initiatorKey: string)
{
    assert(typeof initiatorKey === 'string', `initiatorKey must be of type string, not ${typeof initiatorKey}`);
    connectedSessions.push({ ws, initiatorKey });
}

export function registerSyncObjectConnection(ws: WebSocket, syncObjectId: string)
{
    assert(typeof syncObjectId === 'string', `syncObjectId must be of type string, not ${typeof syncObjectId}`);
    if (!registeredSyncObjectConnections[ syncObjectId ])
    {
        registeredSyncObjectConnections[ syncObjectId ] = [];
    }
    registeredSyncObjectConnections[ syncObjectId ].push({ ws, initiatorKey: syncObjectId });
}

export const buildMessage = (messageType: MessageTypes, target?: string, data?: { [ x: string ]: any; }) =>
{
    const result: any = {
        'type': messageType,
        target,
        data,
    };

    if (messageType === MessageTypes.COMBO)
    {
        assert(data !== undefined);
        result[ COMBO_DATA_KEY ] = data[ COMBO_DATA_KEY ];
        return JSON.stringify(result);
    }

    return JSON.stringify(result);
};

export const dispatchToSyncObjectListeners = (messageType: MessageTypes, syncObjectId: string, data?: { [ x: string ]: any; }) =>
{
    if (!registeredSyncObjectConnections[ syncObjectId ])
    {
        console.log(`Dispatch was requested on an object with no listeners!`);
        return;
    }
    const message = buildMessage(messageType, syncObjectId, data);
    registeredSyncObjectConnections[ syncObjectId ].map(
        (session: ConnectedSyncObjectSession) =>
        {
            const { ws: listenerWS, initiatorKey } = session;
            assert(typeof initiatorKey !== 'undefined', `initiatorKey must be defined!`);
            assert(initiatorKey === syncObjectId, `ID confusion on sync object!`);
            console.log(`Sending ${messageType} to sync-sock ${syncObjectId}`);
            listenerWS.send(message);
            updateSessionLastContact(session);
        });
};

export const dispatchMessageToEveryone = (messageType: MessageTypes, targets?: Array<string> | string, data?: { [ x: string ]: any; }) =>
{
    connectedSessions.forEach(session =>
    {
        if (session.initiatorKey === undefined) { return; }
        console.log(`Sending ${messageType} to user ${session.initiatorKey}`);
        session.ws.send(buildMessage(messageType, undefined, data));
        updateSessionLastContact(session);
    });

    if (typeof targets === 'string')
    {
        dispatchToSyncObjectListeners(messageType, targets, data);
    }
    else
    {
        console.log('targets', targets);
        targets?.map((target) =>
        {
            dispatchToSyncObjectListeners(messageType, target, data);
        });
    }
};

export function validateServerMessage(data: { [ x: string ]: any; })
{
    if (!('authKey' in data)) { throw Error(`Missing "authKey" in server data!`); }
    if (data[ 'authKey' ] !== WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY) { throw Error(`Invalid "authKey" in server data!`); };
}

export function handleServerMessage(data: { [ x: string ]: any; })
{
    try
    {
        validateServerMessage(data);
        console.log(`Server message ${data[ 'type' ]}`);
        delete data[ 'authKey' ];
        dispatchMessageToEveryone(data[ 'type' ], data[ 'targets' ], data[ 'data' ]);
    } catch (e: unknown)
    {
        console.error('Server message error: ', e);
    }
}

export function handleAbandonedSession<T extends ConnectedSession>(purgeList: Array<T>, session: T)
{
    if (!session.abandonedMark) { return markSessionAbandoned(session); } // Not abandoned, mark for next round
    purgeList.push(session);
}

export function markSessionAbandoned<T extends ConnectedSession>(session: T)
{
    session.abandonedMark = true;
}

export function abandonedSessionsGC()
{
    const gcStartTime = Date.now();
    console.log(`[GC] : Beginning Session GC ${gcStartTime}`);


    const syncSessionsToRemove: Array<ConnectedSession> = [];
    for (const syncId in registeredSyncObjectConnections)
    {
        registeredSyncObjectConnections[ syncId ].map(
            (session) => handleAbandonedSession(syncSessionsToRemove, session)
        );
    }

    const sessionsToRemove: Array<ConnectedSession> = [];
    for (const userId in connectedSessions)
    {
        const session = connectedSessions[ userId ];
        handleAbandonedSession(sessionsToRemove, session);
    }


    // Shallow copy to avoid changing size of the dict midway
    for (const syncId in { ...registeredSyncObjectConnections })
    {
        const filteredSessions = registeredSyncObjectConnections[ syncId ]
            .filter(
                (session => (!syncSessionsToRemove.includes(session)))
            );

        if (0 < filteredSessions.length)
        {
            registeredSyncObjectConnections[ syncId ] = filteredSessions;
        }
        else
        {
            console.log(`[GC] : Removing sync object ${syncId}`);
            delete registeredSyncObjectConnections[ syncId ];
        }
    }

    // Shallow copy to avoid changing size of the dict midway
    for (const userId in { ...connectedSessions })
    {
        const session = connectedSessions[ userId ];
        if (sessionsToRemove.includes(session))
        {
            console.log(`[GC] : Removing session ${userId}`);
            delete connectedSessions[ userId ];
        }
    }

    const gcDuration = Date.now() - gcStartTime;
    console.log(`[GC] : Session GC took ${gcDuration / 1000} seconds`);
}
