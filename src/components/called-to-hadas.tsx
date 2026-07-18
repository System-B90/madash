'use client';

import
{
    Campaign as CampaignIcon,
    Done as DoneIcon,
    FormatListBulleted as ListIcon
} from "@mui/icons-material";
import
{
    Box,
    Chip,
    Divider,
    IconButton,
    Paper,
    Skeleton,
    Tooltip,
    Typography
} from "@mui/material";
import { useCallback, useMemo } from "react";

import { apiRemoveStudentCallToHadas, apiUpdateStateStudentCallToHadas } from "@/api-client/call-to-hadas";
import { Room } from "@/api-shared/hive-types";
import { CalledToHadasEntityType, entityUid, GroupToHadasData, ResolvableGroup, ResolvableStudent, StudentToHadasData } from "@/api-shared/types";
import { useCalledEntities } from "@/components/called-students-provider";
import CollapsableCard from "@/components/collapsable-card";
import { useStudents } from "@/components/students-provider";

// --- Sub-Components ---

function EntityRoomItem({ entityToHadasData }: { entityToHadasData: StudentToHadasData | GroupToHadasData; })
{
    const { getStudent } = useStudents();

    const callId = entityToHadasData.callId;

    const isGroup = entityToHadasData.type === CalledToHadasEntityType.Group;
    const isRequested = entityToHadasData?.state === 'requested';

    const deleteCallback = useCallback(() =>
    {
        if (isRequested)
        {
            apiUpdateStateStudentCallToHadas({ callId, state: 'told' });
        } else if (entityToHadasData.state === 'told')
        {
            apiRemoveStudentCallToHadas({ callId });
        }
    }, [ callId, entityToHadasData.state, isRequested ]);

    const tooltipContent = (
        <Box className="flex flex-col items-center" sx={ { p: 0.5 } }>
            <Typography variant="body2" fontWeight="bold" fontStyle={ entityToHadasData.reason ? 'normal' : 'italic' }>
                { entityToHadasData.reason?.length > 0 ? entityToHadasData.reason : "סיבה לא ידועה" }
            </Typography>
            <Divider sx={ { width: '100%', my: 0.75, borderColor: 'rgba(255,255,255,0.2)' } } />
            <Typography variant="caption" sx={ { opacity: 0.8 } }>
                עד { entityToHadasData?.expirationTime?.format('HH:mm') }
            </Typography>
        </Box>
    );

    if (isGroup)
    {
        const groupData = entityToHadasData as GroupToHadasData;
        const groupUsers = groupData.students.map((x) => x.hiveId) || [];
        const groupStudents = groupUsers
            .map((id: number) => getStudent(id))
            .filter((student): student is NonNullable<typeof student> => student !== undefined);

        return (
            <Tooltip placement="top" title={ tooltipContent }>
                <Box
                    component="li"
                    sx={ {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.5,
                        pr: 1.5,
                        pl: 0.5,
                        border: '1px dashed',
                        borderColor: isRequested ? 'warning.main' : 'info.main',
                        borderRadius: '24px',
                        bgcolor: isRequested ? 'transparent' : 'rgba(0, 230, 118, 0.05)',
                        transition: 'all 0.2s',
                        '&:hover': {
                            bgcolor: isRequested ? 'rgba(255, 152, 0, 0.08)' : 'rgba(0, 230, 118, 0.12)',
                        }
                    } }
                >
                    <Box sx={ { display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', px: 1 } }>
                        { groupData.groupName && (
                            <Typography
                                variant="caption"
                                sx={ { fontWeight: 'bold', color: isRequested ? 'warning.main' : 'info.main', mr: 0.5 } }
                            >
                                { groupData.groupName }
                            </Typography>
                        ) }
                        { groupStudents.map((student) => (
                            <Chip
                                key={ student.hiveId }
                                label={ student.name }
                                size="small"
                                variant="filled"
                                sx={ {
                                    height: 22,
                                    fontSize: '0.75rem',
                                    bgcolor: isRequested ? 'rgba(255, 152, 0, 0.15)' : 'rgba(0, 230, 118, 0.15)',
                                    color: isRequested ? 'warning.light' : 'info.light'
                                } }
                            />
                        )) }
                    </Box>

                    <Divider orientation="vertical" flexItem sx={ { mx: 0.5, borderColor: isRequested ? 'warning.main' : 'info.main', opacity: 0.3 } } />

                    <IconButton
                        size="small"
                        onClick={ deleteCallback }
                        color={ isRequested ? "warning" : "info" }
                        sx={ { p: 0.5 } }
                    >
                        { isRequested ? (
                            <Tooltip title="סמן כעודכן"><CampaignIcon fontSize="small" /></Tooltip>
                        ) : (
                            <Tooltip title="סמן כהגיע"><DoneIcon fontSize="small" /></Tooltip>
                        ) }
                    </IconButton>
                </Box>
            </Tooltip>
        );
    }

    // Single Student Rendering
    return (
        <Tooltip placement="top" title={ tooltipContent }>
            <Chip
                component="li"
                label={ (entityToHadasData as StudentToHadasData).student.name || "לא ידוע" }
                size="small"
                color={ isRequested ? "warning" : "info" }
                variant={ isRequested ? "outlined" : "filled" }
                onDelete={ deleteCallback }
                deleteIcon={
                    isRequested ? (
                        <Tooltip title="סמן כעודכן"><CampaignIcon /></Tooltip>
                    ) : (
                        <Tooltip title="סמן כהגיע"><DoneIcon /></Tooltip>
                    )
                }
                sx={ {
                    fontWeight: 500,
                    '& .MuiChip-deleteIcon': {
                        fontSize: '1.25rem',
                        transition: 'color 0.2s',
                        '&:hover': { color: 'inherit', opacity: 0.7 }
                    }
                } }
            />
        </Tooltip>
    );
}

function RoomItem({ room, entities }: { room: Room; entities: Array<StudentToHadasData | GroupToHadasData>; })
{
    if (!entities || entities.length === 0)
    {
        return null;
    }

    return (
        <Box
            sx={ {
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' }
            } }
        >
            <Typography
                variant="caption"
                color="text.secondary"
                sx={ { display: 'block', mb: 1.5, fontWeight: 'bold' } }
            >
                { room.name }
            </Typography>
            <Box
                component="ul"
                className="flex flex-row flex-wrap gap-2 m-0 p-0"
                sx={ { listStyle: 'none' } }
            >
                { entities.map((entityData) => (
                    <EntityRoomItem
                        key={ `room-entity-${entityUid(entityData)}` }
                        entityToHadasData={ entityData }
                    />
                )) }
            </Box>
        </Box>
    );
}

function UnassignedRoomItem({ entities }: { entities: Array<StudentToHadasData | GroupToHadasData>; })
{
    if (!entities || entities.length === 0)
    {
        return null;
    }

    return (
        <Box
            sx={ {
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' }
            } }
        >
            <Typography
                variant="caption"
                color="text.secondary"
                sx={ { display: 'block', mb: 1.5, fontWeight: 'bold' } }
            >
                לא משויכים לכיתה
            </Typography>
            <Box
                component="ul"
                className="flex flex-row flex-wrap gap-2 m-0 p-0"
                sx={ { listStyle: 'none' } }
            >
                { entities.map((entityData) => (
                    <EntityRoomItem
                        key={ `unassigned-entity-${entityUid(entityData)}` }
                        entityToHadasData={ entityData }
                    />
                )) }
            </Box>
        </Box>
    );
}

function RoomSkeleton()
{
    return (
        <Box
            sx={ {
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' }
            } }
        >
            <Skeleton variant="text" width={ 100 } height={ 20 } sx={ { mb: 1.5, borderRadius: 1 } } />
            <Box className="flex flex-row flex-wrap gap-2 m-0 p-0">
                <Skeleton variant="rectangular" width={ 80 } height={ 24 } sx={ { borderRadius: '16px' } } />
                <Skeleton variant="rectangular" width={ 120 } height={ 24 } sx={ { borderRadius: '16px' } } />
                <Skeleton variant="rectangular" width={ 90 } height={ 24 } sx={ { borderRadius: '16px' } } />
            </Box>
        </Box>
    );
}

// --- Main Container Component ---

export default function CalledToHadas()
{
    // Check for explicit isLoading properties, falling back to a rooms undefined check
    const { students: studentsCalledToHadas, groups: groupsCalledToHadas, isLoading: isEntitiesLoading } = useCalledEntities();
    const { rooms, isLoading: isRoomsLoading } = useStudents();

    const isLoading = isEntitiesLoading || isRoomsLoading || !rooms;

    const roomEntities = useMemo(() =>
    {
        const map: Record<number, Array<StudentToHadasData | GroupToHadasData>> = {
            [ -1 ]: [], // -1 for unassigned entities
        };

        if (!rooms) return map;

        rooms.forEach((room) =>
        {
            map[ room.id ] = [];
        });

        studentsCalledToHadas?.forEach((studentCall: StudentToHadasData) =>
        {
            const roomId = rooms.find((room: Room) => room.users.includes(studentCall.student.hiveId))?.id;
            if (roomId !== undefined)
            {
                map[ roomId ].push(studentCall);
            } else
            {
                map[ -1 ].push(studentCall);
            }
        });

        groupsCalledToHadas?.forEach((groupCall: GroupToHadasData) =>
        {
            const groupUserIds: number[] = groupCall.students.map((x) => x.hiveId) || [];

            if (groupUserIds.length === 0)
            {
                map[ -1 ].push(groupCall);
                return;
            }

            const targetRoom = rooms.find((room: Room) => room.users.includes(groupUserIds[ 0 ]));

            if (!targetRoom)
            {
                map[ -1 ].push(groupCall);
                return;
            }

            const isSameRoom = groupUserIds.every((userId) => targetRoom.users.includes(userId));

            if (isSameRoom)
            {
                map[ targetRoom.id ].push(groupCall);
            } else
            {
                map[ -1 ].push(groupCall);
            }
        });

        return map;
    }, [ studentsCalledToHadas, groupsCalledToHadas, rooms ]);

    const totalCalledEntities = (studentsCalledToHadas?.length || 0) + (groupsCalledToHadas?.length || 0);

    return (
        <CollapsableCard
            name={ "סטטוס קריאות" } icon={ ListIcon } mainColor={ 'info' } content={
                isLoading ? (
                    <>
                        <RoomSkeleton />
                        <RoomSkeleton />
                        <RoomSkeleton />
                    </>
                ) : (
                    <>
                        { rooms.map((room: Room) => (
                            <RoomItem key={ `room-item-${room.id}` } room={ room } entities={ roomEntities[ room.id ] } />
                        )) }

                        <UnassignedRoomItem entities={ roomEntities[ -1 ] } />

                        { totalCalledEntities === 0 && (
                            <Box sx={ { p: 4, textAlign: 'center' } }>
                                <Typography variant="body2" color="text.secondary">
                                    אין קריאות פעילות.
                                </Typography>
                            </Box>
                        ) }
                    </>
                )
            } />
    );
}
