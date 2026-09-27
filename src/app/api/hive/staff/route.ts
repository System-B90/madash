export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { denyUnauthenticated } from "@/api-server/auth-gate";
import { ApiSuccess, catchHandler } from "@/api-server/common";
import createHiveClient from "@/api-server/hive/session-client";
import { Clearance } from "@/api-shared/hive-types";
import type { StaffMember } from "@/api-shared/mentions";

/** Segel, admins and checkers — trimmed to what the mention hover cards show. */
export async function GET(
    request: NextRequest
)
{
    const denied = await denyUnauthenticated();
    if (denied) return denied;

    try
    {
        const hiveClient = await createHiveClient();
        const users = await hiveClient.getUsers({
            clearance__in: [ Clearance.Checker, Clearance.Segel, Clearance.Admin ].join(","),
        });
        const staff: StaffMember[] = users.map((u) => ({
            id: u.id,
            name: u.display_name,
            clearance: u.clearance,
            status: u.status,
            statusDate: u.status_date,
            mentees: u.mentees ?? [],
            checkersBrief: u.checkers_brief ?? "",
        }));
        return ApiSuccess(staff);
    }
    catch (e)
    {
        return catchHandler(request, e);
    };
}
