import { describe, expect, it } from "vitest";
import {
    ClientError,
    ClientApiError,
    ServerNetworkError,
    UserNotLoggedInError,
    CallToHadasError,
    HiveClientError,
    constructErrorFromNetworkMessage
} from "@/api-shared/errors";

describe("Custom Error classes", () => {
    it("ClientError sets standard error message and status", () => {
        const err = new ClientError("Failed validation");
        expect(err.message).toBe("Failed validation");
        expect(err.status).toBe("Failed validation");
        expect(err.name).toBe("ClientError");
    });

    it("ServerNetworkError inherits ClientError and sets name", () => {
        const err = new ServerNetworkError("Network timeout");
        expect(err.message).toBe("Network timeout");
        expect(err.status).toBe("Network timeout");
        expect(err.name).toBe("ServerNetworkError");
    });

    it("ClientApiError handles string messages", () => {
        const err = new ClientApiError("API limit exceeded");
        expect(err.message).toBe("API limit exceeded");
        expect(err.name).toBe("ClientApiError");
    });

    it("ClientApiError reconstructs from another ClientApiError", () => {
        const original = new ClientApiError("original message");
        original.name = "CustomApiError";
        original.status = "400";

        const cloned = new ClientApiError(original);
        expect(cloned.message).toBe("original message");
        expect(cloned.name).toBe("CustomApiError");
        expect(cloned.status).toBe("400");
    });

    it("constructErrorFromNetworkMessage correctly wraps network messages", () => {
        const networkMessage = new ClientApiError("Something went wrong");
        networkMessage.name = "CallToHadasError";
        
        const wrapped = constructErrorFromNetworkMessage(networkMessage);
        expect(wrapped).toBeInstanceOf(ClientApiError);
        expect(wrapped.message).toBe("Something went wrong");
        expect(wrapped.name).toBe("CallToHadasError");
    });

    it("Specific subclass errors have the correct class name", () => {
        const notLoggedIn = new UserNotLoggedInError("Not logged in");
        expect(notLoggedIn.name).toBe("UserNotLoggedInError");

        const hadasError = new CallToHadasError("Duplicate call");
        expect(hadasError.name).toBe("CallToHadasError");

        const hiveError = new HiveClientError("Hive offline");
        expect(hiveError.name).toBe("HiveClientError");
    });
});
