'use client';

import { Box, Chip, Divider, Stack, Tooltip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';

import type { Class } from '@/api-shared/hive-types';
import {
    isPresent,
    type MentionDirectory,
    type MentionEntity,
    type Person,
    STATUS_LABELS,
    statusBreakdown,
} from '@/api-shared/mentions';
import { MENTION_KIND_STYLE, STATUS_TONE } from '@/components/mentions/mention-kinds';

const MAX_LISTED = 10;

function CardHeader({ entity, subtitle }: { entity: MentionEntity; subtitle?: string; })
{
    const { icon: Icon, palette, singular } = MENTION_KIND_STYLE[ entity.kind ];
    return (
        <Stack direction="row" alignItems="center" gap={ 1 }>
            <Box
                sx={ {
                    width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: `${palette}.main`,
                    bgcolor: (theme) => `rgba(${theme.vars!.palette[ palette ].mainChannel} / 0.14)`,
                } }
            >
                <Icon fontSize="small" />
            </Box>
            <Box sx={ { minWidth: 0 } }>
                <Typography variant="subtitle2" fontWeight={ 700 } noWrap>{ entity.name }</Typography>
                <Typography variant="caption" color="text.secondary">{ subtitle ?? singular }</Typography>
            </Box>
        </Stack>
    );
}

function StatusLine({ person }: { person: Person; })
{
    const since = person.statusDate ? dayjs(person.statusDate) : null;
    return (
        <Stack direction="row" alignItems="center" gap={ 0.75 } data-testid="mention-status">
            <Box sx={ { width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_TONE[ person.status ], flexShrink: 0 } } />
            <Typography variant="body2">{ STATUS_LABELS[ person.status ] ?? person.status }</Typography>
            { since?.isValid() && <Typography variant="caption" color="text.secondary">מאז { since.format('HH:mm') }</Typography> }
        </Stack>
    );
}

function Section({ title, children }: { title: string; children: ReactNode; })
{
    return (
        <Box>
            <Typography variant="overline" color="text.secondary" sx={ { lineHeight: 1.6 } }>{ title }</Typography>
            { children }
        </Box>
    );
}

function ClassChips({ classes }: { classes: Class[]; })
{
    return (
        <Stack direction="row" flexWrap="wrap" gap={ 0.5 }>
            { classes.map((c) => <Chip key={ c.id } size="small" variant="outlined" label={ c.name } />) }
        </Stack>
    );
}

function NameList({ people }: { people: Person[]; })
{
    const shown = people.slice(0, MAX_LISTED);
    return (
        <Typography variant="body2" sx={ { lineHeight: 1.6 } }>
            { shown.map((p, i) => (
                <Box component="span" key={ p.id } sx={ { opacity: isPresent(p.status) ? 1 : 0.55 } } title={ STATUS_LABELS[ p.status ] }>
                    { p.name }{ i < shown.length - 1 ? ', ' : '' }
                </Box>
            )) }
            { people.length > MAX_LISTED && <Box component="span" color="text.secondary"> ועוד { people.length - MAX_LISTED }</Box> }
        </Typography>
    );
}

/** Attendance at a glance: a stacked bar of statuses, with a legend. */
function AttendanceBar({ people }: { people: Person[]; })
{
    const breakdown = statusBreakdown(people);
    if (people.length === 0) return <Typography variant="body2" color="text.secondary">אין חברים</Typography>;
    return (
        <Box data-testid="attendance-bar">
            <Box sx={ { display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: 'action.hover' } }>
                { breakdown.map(({ status, count }) => (
                    <Tooltip key={ status } title={ `${STATUS_LABELS[ status ]}: ${count}` }>
                        <Box sx={ { flex: count, bgcolor: STATUS_TONE[ status ] } } />
                    </Tooltip>
                )) }
            </Box>
            <Stack direction="row" flexWrap="wrap" columnGap={ 1.25 } rowGap={ 0.25 } sx={ { mt: 0.75 } }>
                { breakdown.map(({ status, count }) => (
                    <Stack key={ status } direction="row" alignItems="center" gap={ 0.5 }>
                        <Box sx={ { width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_TONE[ status ] } } />
                        <Typography variant="caption">{ STATUS_LABELS[ status ] } { count }</Typography>
                    </Stack>
                )) }
            </Stack>
        </Box>
    );
}

function presentSummary(people: Person[]): string
{
    const present = people.filter((p) => isPresent(p.status)).length;
    return `${people.length} חניכים · ${present} נוכחים`;
}

function StudentCard({ entity, dir }: { entity: MentionEntity; dir: MentionDirectory; })
{
    const person = dir.person(entity.id);
    const rooms = dir.roomsOf(entity.id);
    const groups = dir.groupsOf(entity.id);
    const mentor = dir.mentorOf(entity.id);
    return (
        <>
            <CardHeader entity={ entity } />
            { person && <StatusLine person={ person } /> }
            <Section title={ rooms.length > 1 ? `חדרים (${rooms.length})` : 'חדר' }>
                { rooms.length ? <ClassChips classes={ rooms } /> : <Typography variant="body2" color="text.secondary">לא משובץ לחדר</Typography> }
            </Section>
            { groups.length > 0 && <Section title="קבוצות"><ClassChips classes={ groups } /></Section> }
            { mentor && <Section title="חונך/ת"><Typography variant="body2">{ mentor.name }</Typography></Section> }
        </>
    );
}

function RoomCard({ entity, dir }: { entity: MentionEntity; dir: MentionDirectory; })
{
    const { students, staff } = dir.membersOf(entity.id);
    return (
        <>
            <CardHeader entity={ entity } subtitle={ `חדר · ${presentSummary(students)}` } />
            <Section title="נוכחות"><AttendanceBar people={ students } /></Section>
            { staff.length > 0 && <Section title="סגל בחדר"><NameList people={ staff } /></Section> }
            { students.length > 0 && <Section title="חניכים"><NameList people={ students } /></Section> }
        </>
    );
}

function GroupCard({ entity, dir }: { entity: MentionEntity; dir: MentionDirectory; })
{
    const { students } = dir.membersOf(entity.id);
    // Where the group is right now: how many of its members sit in each room.
    const perRoom = new Map<number, { room: Class; count: number; }>();
    for (const s of students)
        for (const room of dir.roomsOf(s.id))
            perRoom.set(room.id, { room, count: (perRoom.get(room.id)?.count ?? 0) + 1 });
    const spread = [ ...perRoom.values() ].sort((a, b) => b.count - a.count);
    return (
        <>
            <CardHeader entity={ entity } subtitle={ `קבוצה · ${presentSummary(students)}` } />
            <Section title="נוכחות"><AttendanceBar people={ students } /></Section>
            { spread.length > 0 && (
                <Section title={ spread.length === 1 ? 'כולם בחדר אחד' : `פרוסים ב־${spread.length} חדרים` }>
                    <Stack direction="row" flexWrap="wrap" gap={ 0.5 }>
                        { spread.map(({ room, count }) => <Chip key={ room.id } size="small" variant="outlined" label={ `${room.name} · ${count}` } />) }
                    </Stack>
                </Section>
            ) }
        </>
    );
}

function SegelCard({ entity, dir }: { entity: MentionEntity; dir: MentionDirectory; })
{
    const mentees = dir.staff(entity.id)?.mentees ?? [];
    const person = dir.person(entity.id);
    const menteePeople = mentees.map((id) => dir.person(id)).filter((p): p is Person => !!p);
    const rooms = dir.roomsOf(entity.id);
    return (
        <>
            <CardHeader entity={ entity } subtitle="איש/ת סגל" />
            { person && <StatusLine person={ person } /> }
            { menteePeople.length > 0 && (
                <Section title={ `חניכים בחניכה (${menteePeople.length})` }><NameList people={ menteePeople } /></Section>
            ) }
            { rooms.length > 0 && <Section title="חדרים"><ClassChips classes={ rooms } /></Section> }
        </>
    );
}

function CheckerCard({ entity, dir }: { entity: MentionEntity; dir: MentionDirectory; })
{
    const brief = dir.staff(entity.id)?.checkersBrief ?? '';
    const person = dir.person(entity.id);
    const rooms = dir.roomsOf(entity.id);
    return (
        <>
            <CardHeader entity={ entity } subtitle="בודק/ת" />
            { person && <StatusLine person={ person } /> }
            { brief && (
                <Section title="תדריך בדיקה">
                    <Typography
                        variant="body2"
                        sx={ {
                            whiteSpace: 'pre-line', paddingInlineStart: 1, borderInlineStart: '2px solid', borderColor: 'success.main',
                            display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        } }
                    >
                        { brief }
                    </Typography>
                </Section>
            ) }
            { rooms.length > 0 && <Section title="חדרים"><ClassChips classes={ rooms } /></Section> }
        </>
    );
}

/** The hover card for one mention — its content depends on what kind of thing was tagged. */
export default function MentionCard({ entity, dir }: { entity: MentionEntity; dir: MentionDirectory; })
{
    let body: ReactNode;
    switch (entity.kind)
    {
        case 'student': body = <StudentCard entity={ entity } dir={ dir } />; break;
        case 'room': body = <RoomCard entity={ entity } dir={ dir } />; break;
        case 'group': body = <GroupCard entity={ entity } dir={ dir } />; break;
        case 'segel': body = <SegelCard entity={ entity } dir={ dir } />; break;
        case 'checker': body = <CheckerCard entity={ entity } dir={ dir } />; break;
    }
    return (
        <Stack gap={ 1 } divider={ <Divider flexItem /> } data-testid="mention-card" data-kind={ entity.kind } sx={ { p: 0.5, minWidth: 220, maxWidth: 320 } } dir="rtl">
            { body }
        </Stack>
    );
}
