/*
 * Hive entity types now live in @system-b90/hive-core; this module remains
 * the app-side import path (`@/api-shared/hive-types`).
 */
export {
    ClassTypeEnum,
    Clearance,
    clearanceName,
    GenderEnum,
    QueueType,
    StatusEnum,
} from "@system-b90/hive-core";
export type {
    Class,
    CourseUser,
    RoomClass as Room,
} from "@system-b90/hive-core";
