/*
 * Hive entity types now live in @system-b15/hive-core; this module remains
 * the app-side import path (`@/api-shared/hive-types`).
 */
export {
    ClassTypeEnum,
    Clearance,
    clearanceName,
    GenderEnum,
    QueueType,
    StatusEnum,
} from "@system-b15/hive-core";
export type {
    Class,
    CourseUser,
    RoomClass as Room,
} from "@system-b15/hive-core";
