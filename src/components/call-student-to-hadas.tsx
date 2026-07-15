'use client';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AlarmIcon from "@mui/icons-material/Alarm";
import CallMadeIcon from '@mui/icons-material/CallMade';
import
{
    Box,
    BoxProps,
    Checkbox,
    CircularProgress,
    ClickAwayListener,
    Divider,
    FormControlLabel,
    IconButton,
    Paper,
    Popper,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/he";
import relativeTime from "dayjs/plugin/relativeTime";
import { useSnackbar } from "notistack";
import React, { ChangeEventHandler, Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";

import { apiCallStudentToHadas } from "@/api-client/call-to-hadas";
import { enqueueApiErrorSnackbar } from "@/api-client/common";
import CollapsableCard from "@/components/collapsable-card";
import TalkIcon from "@/components/icons/talk";
import { useStudents } from "@/components/students-provider";
import StudentsSelector from "@/components/students-selector";

dayjs.extend(relativeTime);
dayjs.locale("he");


interface AlarmClockTimePickerFormProps extends BoxProps
{
    time: Dayjs | null;
    setTime: Dispatch<SetStateAction<Dayjs | null>>;
}

function AlarmClockTimePickerForm({ time, setTime, ...props }: AlarmClockTimePickerFormProps)
{
    const [ anchorEl, setAnchorEl ] = useState<HTMLButtonElement | null>(null);
    const open = Boolean(anchorEl);

    const handleOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) =>
    {
        setAnchorEl(event.currentTarget);
    }, []);

    const handleClose = useCallback(() =>
    {
        setAnchorEl(null);
    }, []);

    const expiryStatus = useMemo(() =>
    {
        if (!time) return null;
        const now = dayjs();
        const diff = time.diff(now, 'minute');

        if (diff <= 0) return { label: "פג תוקף", color: "error" as const };
        return { label: `בעוד ${time.fromNow(true)}`, color: "info" as const };
    }, [ time ]);

    return (
        <Box { ...props } className="flex flex-col items-center">
            <Tooltip title="קבע זמן פקיעה" placement="top">
                <IconButton
                    onClick={ handleOpen }
                    color={ time ? "primary" : "default" }
                    sx={ { border: '1px solid', borderColor: 'divider' } }
                >
                    <AlarmIcon fontSize="medium" />
                </IconButton>
            </Tooltip>

            { expiryStatus && (
                <Typography
                    variant="caption"
                    color={ expiryStatus.color === "error" ? "error.main" : "text.secondary" }
                    sx={ { mt: 0.5, fontWeight: 'medium', fontSize: '0.7rem', textAlign: 'center' } }
                    flexWrap={ 'wrap' }
                    maxWidth={ '2rem' }
                >
                    { expiryStatus.label }
                </Typography>
            ) }

            <Popper open={ open } anchorEl={ anchorEl } placement="bottom-end" style={ { zIndex: 1300 } }>
                <ClickAwayListener onClickAway={ handleClose }>
                    <Paper elevation={ 3 } sx={ { p: 1 } }>
                        <TimePicker
                            open={ open }
                            onClose={ handleClose }
                            value={ time }
                            onChange={ (newValue) =>
                            {
                                setTime(newValue ? dayjs(newValue) : null);
                                handleClose();
                            } }
                            ampm={ false }
                            minutesStep={ 5 }
                            disablePast
                            openTo="minutes"
                            closeOnSelect
                            slotProps={ {
                                textField: { style: { display: 'none' } },
                                popper: { anchorEl: anchorEl, open: open },
                            } }
                        />
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Box>
    );
}

function CallHadasHeader()
{
    return (
        <>
            <Box sx={ { px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 } }>
                <TalkIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="bold" color="text.primary">

                </Typography>
            </Box>
            <Divider />
        </>
    );
}

interface CallHadasStudentRowProps
{
    selectedStudents: Array<number>;
    setSelectedStudents: Dispatch<SetStateAction<Array<number>>>;
    expirationTime: Dayjs | null;
    setExpirationTime: Dispatch<SetStateAction<Dayjs | null>>;
}

function CallHadasStudentRow({ selectedStudents, setSelectedStudents, expirationTime, setExpirationTime }: CallHadasStudentRowProps)
{
    return (
        <Box className="flex flex-row items-stretch w-full gap-3 flex-nowrap">
            <Box className="grow flex">
                <StudentsSelector
                    width="100%"
                    sx={ {
                        height: '100%',
                        '& .MuiInputBase-root': {
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center'
                        }
                    } }
                    setSelected={ setSelectedStudents }
                    selected={ selectedStudents }
                />
            </Box>
            <Box className="shrink-0 flex flex-col items-center justify-start pt-1">
                <AlarmClockTimePickerForm time={ expirationTime } setTime={ setExpirationTime } />
            </Box>
        </Box>
    );
}

interface CallHadasActionRowProps
{
    reason: string;
    onReasonChange: ChangeEventHandler<HTMLInputElement>;
    isGroupCall: boolean;
    onGroupCallChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    loading: boolean;
    isSubmitDisabled: boolean;
    hasMultipleStudents: boolean;
}

function CallHadasActionRow({
    reason,
    onReasonChange,
    isGroupCall,
    onGroupCallChange,
    loading,
    isSubmitDisabled,
    hasMultipleStudents
}: CallHadasActionRowProps)
{
    return (
        <Box className="flex flex-row items-start w-full gap-3 flex-nowrap">
            <TextField
                label="סיבה"
                name="reason"
                className="grow"
                size="small"
                multiline
                minRows={ 2 }
                maxRows={ 7 }
                fullWidth
                value={ reason }
                onChange={ onReasonChange }
                InputLabelProps={ {
                    sx: {
                        backgroundColor: 'background.default',
                        padding: '0 4px',
                    }
                } }
            />

            <Box className="flex flex-col items-center shrink-0 gap-1">
                <Tooltip title={ reason.length > 0 ? "שלח קריאה" : "ככה בלי סיבה?" } placement="top">
                    <span>
                        <IconButton
                            type="submit"
                            color="primary"
                            disabled={ isSubmitDisabled }
                            sx={ {
                                border: '1px solid',
                                borderColor: isSubmitDisabled ? 'divider' : (reason.length > 0 ? 'primary.main' : 'warning.main'),
                                bgcolor: isSubmitDisabled ? 'transparent' : 'rgba(0, 230, 118, 0.08)',
                                '&:hover': { bgcolor: 'rgba(0, 230, 118, 0.15)' },
                                width: 40,
                                height: 40
                            } }
                        >
                            { loading ? <CircularProgress size={ 24 } /> : <CallMadeIcon /> }
                        </IconButton>
                    </span>
                </Tooltip>

                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={ isGroupCall && hasMultipleStudents }
                            onChange={ onGroupCallChange }
                            color="primary"
                            disabled={ !hasMultipleStudents }
                            sx={ { p: 0.5 } }
                        />
                    }
                    label={
                        <Typography
                            variant="caption"
                            maxWidth={ '2rem' }
                            color={ hasMultipleStudents ? "text.secondary" : "text.disabled" }
                            sx={ { whiteSpace: 'nowrap', fontSize: '0.75rem', textWrap: 'wrap' } }
                            flexWrap={ 'wrap' }
                        >
                            כקבוצה
                        </Typography>
                    }
                    sx={ { m: 0 } }
                />
            </Box>
        </Box>
    );
}

export default function CallStudentToHadas()
{
    const [ loading, setLoading ] = useState<boolean>(false);
    const [ isGroupCall, setIsGroupCall ] = useState<boolean>(false);
    const [ selectedStudents, setSelectedStudents ] = useState<Array<number>>([]);
    const [ reason, setReason ] = useState<string>('');
    const [ expirationTime, setExpirationTime ] = useState<Dayjs | null>(
        dayjs().add(6, 'hour').minute(dayjs().minute() + 4 - ((dayjs().minute() + 4) % 5))
    );

    const { getStudent } = useStudents();
    const { enqueueSnackbar } = useSnackbar();

    const formSubmitCallback = useCallback(async (event: React.FormEvent<HTMLFormElement>): Promise<void> =>
    {
        event.preventDefault();

        if (expirationTime === null) return;

        setLoading(true);

        const students = selectedStudents
            .map((hiveId) => getStudent(hiveId))
            .filter((v): v is NonNullable<typeof v> => v !== undefined);

        apiCallStudentToHadas({ students, reason, expirationTime, groupCall: isGroupCall })
            .then((message) =>
            {
                setSelectedStudents([]);
                setReason('');
                setIsGroupCall(false);
                enqueueSnackbar(message, { variant: 'success' });
            })
            .catch((error) =>
            {
                enqueueApiErrorSnackbar(enqueueSnackbar, 'הקריאה נכשלה!', error);
            })
            .finally(() => setLoading(false));
    }, [ isGroupCall, reason, selectedStudents, expirationTime, getStudent, enqueueSnackbar ]);

    const reasonValueChangeCallback: ChangeEventHandler<HTMLInputElement> = useCallback((event) =>
    {
        setReason(event.currentTarget.value);
    }, []);

    return (
        <CollapsableCard name={ "קריאה לחד\"ס" } icon={ TalkIcon } mainColor={ 'primary' } content={ <Box
            component="form"
            className="flex flex-col gap-4 p-4"
            dir="rtl"
            onSubmit={ formSubmitCallback }
            noValidate
            autoComplete="off"
            sx={ { bgcolor: 'background.default' } }
        >
            <CallHadasStudentRow
                selectedStudents={ selectedStudents }
                setSelectedStudents={ setSelectedStudents }
                expirationTime={ expirationTime }
                setExpirationTime={ setExpirationTime }
            />
            <CallHadasActionRow
                reason={ reason }
                onReasonChange={ reasonValueChangeCallback }
                loading={ loading }
                isSubmitDisabled={ loading || selectedStudents.length === 0 }
                hasMultipleStudents={ selectedStudents.length > 1 }
                isGroupCall={ isGroupCall }
                onGroupCallChange={ (event) => setIsGroupCall(event.target.checked) }
            />
        </Box> } />
    );
}
