import { render, screen, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth-provider", () => ({ useAuth: vi.fn() }));
vi.mock("@/api-client/hive", () => ({ apiGetClasses: vi.fn(), apiGetStudents: vi.fn() }));
vi.mock("@/api-client/common", () => ({ enqueueApiErrorSnackbar: vi.fn() }));
// Stable identities: the provider's fetch callbacks depend on these, so a new
// function per render would refetch -> re-render -> refetch forever.
const snackbar = vi.hoisted(() => ({ enqueueSnackbar: () => undefined }));
vi.mock("notistack", () => ({ useSnackbar: () => snackbar }));

import { enqueueApiErrorSnackbar } from "@/api-client/common";
import { apiGetClasses, apiGetStudents } from "@/api-client/hive";
import { ClassTypeEnum } from "@/api-shared/hive-types";
import { useAuth } from "@/components/auth-provider";
import { StudentsProvider, useStudents } from "@/components/students-provider";
import { MessageTypes } from "@/settings";

/**
 * StudentsProvider owns the fetching and WS-driven refresh around the tested
 * reducer (madash#33): load both lists, join students to their room, surface
 * failures, and refetch on SHUFFLE_MOVE only.
 */

type Handler = (type: MessageTypes, data?: unknown, target?: string) => void;
let wsHandler: Handler | undefined;

const CLASSES = [
    { id: 1, name: "חדר 5", type: ClassTypeEnum.Room, users: [ 10 ] },
    { id: 2, name: "קבוצה א", type: ClassTypeEnum.Student_Group, users: [ 10, 11 ] },
];
const STUDENTS = [
    { id: 10, display_name: "דנה", number: 101 },
    { id: 11, display_name: "יוסי", number: 102 },
];

function Probe() {
    const { isLoading, students, rooms, getStudent } = useStudents();
    return (
        <div>
            <span data-testid="loading">{ String(isLoading) }</span>
            <span data-testid="students">{ students.map((s) => `${s.name}@${s.room}`).join(",") }</span>
            <span data-testid="rooms">{ rooms.map((r) => r.name).join(",") }</span>
            <span data-testid="lookup">{ getStudent(11)?.name ?? "-" }</span>
        </div>
    );
}

function renderProvider() {
    return render(<StudentsProvider><Probe /></StudentsProvider>);
}

beforeEach(() => {
    wsHandler = undefined;
    const auth = {
        addMessageHandler: (h: Handler) => {
            wsHandler = h;
            return () => undefined;
        },
    };
    vi.mocked(useAuth).mockReturnValue(auth as never);
    vi.mocked(apiGetClasses).mockReset().mockResolvedValue(CLASSES as never);
    vi.mocked(apiGetStudents).mockReset().mockResolvedValue(STUDENTS as never);
    vi.mocked(enqueueApiErrorSnackbar).mockReset();
});

describe("StudentsProvider", () => {
    it("loads classes and students and joins each student to their room", async () => {
        renderProvider();
        expect(screen.getByTestId("loading")).toHaveTextContent("true");

        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
        expect(screen.getByTestId("students")).toHaveTextContent("דנה@חדר 5,יוסי@Unknown");
        expect(screen.getByTestId("rooms")).toHaveTextContent("חדר 5");
        expect(screen.getByTestId("lookup")).toHaveTextContent("יוסי");
    });

    it("surfaces a failed fetch and still stops loading", async () => {
        vi.mocked(apiGetStudents).mockRejectedValue(new Error("hive down"));
        renderProvider();

        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
        expect(enqueueApiErrorSnackbar).toHaveBeenCalledWith(
            expect.anything(),
            "טעינת מידע על חניכים נכשלה!",
            expect.any(Error),
        );
    });

    it("refetches on SHUFFLE_MOVE and ignores other messages", async () => {
        renderProvider();
        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
        expect(apiGetStudents).toHaveBeenCalledTimes(1);

        const other = Object.values(MessageTypes).find((t) => t !== MessageTypes.SHUFFLE_MOVE) as MessageTypes;
        act(() => wsHandler?.(other));
        expect(apiGetStudents).toHaveBeenCalledTimes(1);

        vi.mocked(apiGetStudents).mockResolvedValue([ STUDENTS[0] ] as never);
        act(() => wsHandler?.(MessageTypes.SHUFFLE_MOVE));
        await waitFor(() => expect(screen.getByTestId("students")).toHaveTextContent(/^דנה@חדר 5$/));
        expect(apiGetClasses).toHaveBeenCalledTimes(2);
    });

    it("throws when used outside the provider", () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        expect(() => render(<Probe />)).toThrow("useStudents must be used within a StudentsProvider");
    });
});
