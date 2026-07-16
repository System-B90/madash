/*
 * Shared error hierarchy now lives in @system-b90/hive-core; this module
 * remains the app-side import path (`@/api-shared/errors`) and keeps
 * madash-specific errors.
 */
import { ClientApiError } from "@system-b90/hive-core";

export {
    ApiNotImplementedError,
    ClientApiError,
    ClientError,
    constructErrorFromNetworkMessage,
    HiveClientError,
    ServerNetworkError,
    UserNotLoggedInError,
} from "@system-b90/hive-core";

export class CallToHadasError extends ClientApiError
{
    constructor(message?: string)
    {
        super(message);
        this.name = 'CallToHadasError';
    }
}
