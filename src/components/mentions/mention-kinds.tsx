import BadgeIcon from '@mui/icons-material/Badge';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GroupsIcon from '@mui/icons-material/Groups';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PersonIcon from '@mui/icons-material/Person';
import type { ElementType } from 'react';

import { StatusEnum } from '@/api-shared/hive-types';
import type { MentionKind } from '@/api-shared/mentions';

export type KindPalette = 'primary' | 'secondary' | 'info' | 'warning' | 'success';

/** Each kind reads differently at a glance: its own icon and theme colour. */
export const MENTION_KIND_STYLE: Record<MentionKind, { icon: ElementType; palette: KindPalette; singular: string; }> = {
    student: { icon: PersonIcon, palette: 'primary', singular: 'חניך/ה' },
    segel: { icon: BadgeIcon, palette: 'warning', singular: 'סגל' },
    checker: { icon: FactCheckIcon, palette: 'success', singular: 'בודק/ת' },
    room: { icon: MeetingRoomIcon, palette: 'secondary', singular: 'חדר' },
    group: { icon: GroupsIcon, palette: 'info', singular: 'קבוצה' },
};

/** Theme colour per Hive status: here / stepped out / in a talk / away. */
export const STATUS_TONE: Record<StatusEnum, string> = {
    [ StatusEnum.Present ]: 'success.main',
    [ StatusEnum.Raised_Hand ]: 'success.light',
    [ StatusEnum.Room ]: 'success.dark',
    [ StatusEnum.Toilet_Request ]: 'warning.light',
    [ StatusEnum.Toilet ]: 'warning.main',
    [ StatusEnum.Personal_Talk ]: 'info.main',
    [ StatusEnum.Work_Talk ]: 'info.light',
    [ StatusEnum.Medical ]: 'error.main',
    [ StatusEnum.Prayer ]: 'secondary.main',
    [ StatusEnum.Home ]: 'text.disabled',
};
