'use client';

import { alpha, Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';

import { useStudents } from '@/components/students-provider';

export const HELPS_PER_STUDENT_DANGER = 1 / 5;
const HELPS_PER_STUDENT_WARN = (1 / 5) * 0.75;
const OPEN_HELPS_GAUGE_W = 56;
const OPEN_HELPS_GAUGE_H = 44;
const OPEN_HELPS_WRAP_H = 50;
const OPEN_HELPS_GAUGE_TOP = 16;

export default function OpenHelpsGauge({
    openHelpsCount,
    helpsLoading,
}: {
    openHelpsCount: number | null;
    helpsLoading: boolean;
})
{
    const theme = useTheme();
    const { students, isLoading: studentsLoading } = useStudents();

    const helpsKnown = openHelpsCount !== null;
    const helps = openHelpsCount ?? 0;
    const studentCount = students.length;
    const denom = Math.max(studentCount, 1);

    const optimisticUnknownStudents = studentsLoading && studentCount === 0;
    const ratioUsedForNeedle = !helpsKnown || optimisticUnknownStudents ? 0 : helps / denom;
    const ratioActual = helpsKnown && !optimisticUnknownStudents ? helps / denom : null;

    const dangerous = ratioActual !== null && ratioActual > HELPS_PER_STUDENT_DANGER;
    const warn = ratioActual !== null && ratioActual > HELPS_PER_STUDENT_WARN && ratioActual <= HELPS_PER_STUDENT_DANGER;

    const gaugePct = Math.min(100, (ratioUsedForNeedle / HELPS_PER_STUDENT_DANGER) * 100);

    const arcColor = dangerous
        ? theme.palette.error.main
        : warn
            ? theme.palette.warning.main
            : theme.palette.success.main;

    const thresholdHelps = Math.ceil(denom * HELPS_PER_STUDENT_DANGER);

    const tooltipTitle = (
        <Stack component="span" spacing={ 0.25 } sx={ { py: 0.25 } }>
            <Typography variant="caption" component="span" display="block">
                { helpsLoading ? 'טוען הלפים פתוחות…' : `הלפים פתוחות: ${helps}` }
            </Typography>
            <Typography variant="caption" component="span" display="block" color="text.secondary">
                { studentsLoading ? 'טוען חניכים…' : `חניכים: ${studentCount}` }
            </Typography>
            <Typography variant="caption" component="span" display="block">
                { `מצב מסוכן מעל ${thresholdHelps} הלפים (יותר מ־⅕ לחניך)` }
            </Typography>
        </Stack>
    );

    return (
        <Tooltip title={ tooltipTitle } arrow placement="top">
            <Box
                sx={ {
                    position: 'relative',
                    width: OPEN_HELPS_GAUGE_W,
                    height: OPEN_HELPS_WRAP_H,
                    flexShrink: 0,
                    top: -5,
                } }
            >
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={ {
                        position: 'absolute',
                        top: 10,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontSize: '0.65rem',
                        lineHeight: 1.1,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        zIndex: 1,
                        pointerEvents: 'none',
                    } }
                >
                    הלפים
                </Typography>
                <Box
                    sx={ {
                        position: 'absolute',
                        top: OPEN_HELPS_GAUGE_TOP,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        lineHeight: 0,
                    } }
                >
                    <Gauge
                        width={ OPEN_HELPS_GAUGE_W }
                        height={ OPEN_HELPS_GAUGE_H }
                        value={ gaugePct }
                        valueMin={ 0 }
                        valueMax={ 100 }
                        startAngle={ -100 }
                        endAngle={ 100 }
                        text={ helpsLoading ? '…' : helpsKnown ? String(helps) : '—' }
                        sx={ {
                            [ `& .${gaugeClasses.valueArc}` ]: { fill: arcColor },
                            [ `& .${gaugeClasses.referenceArc}` ]: {
                                fill: alpha(theme.palette.text.primary, 0.08),
                            },
                            [ `& .${gaugeClasses.valueText}` ]: {
                                fontSize: 13,
                                fontWeight: 700,
                            },
                        } }
                    />
                </Box>
            </Box>
        </Tooltip>
    );
}
