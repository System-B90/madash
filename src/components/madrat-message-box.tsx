'use client';

import { Box, ListItemText, MenuItem, MenuList, Paper, Popper, TextField } from "@mui/material";
import { enqueueSnackbar } from 'notistack';
import { ChangeEventHandler, KeyboardEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { enqueueApiErrorSnackbar } from '@/api-client/common';
import { apiGetMadratMessage, apiPostMadratMessage } from '@/api-client/madrat';
import { useAuth } from '@/components/auth-provider';
import MuiMarkdown, { type HighlightedName } from '@/components/mui-markdown';
import { MessageHandlerType } from '@/components/session-ws';
import { useStudents } from '@/components/students-provider';
import { MessageTypes } from '@/settings';
import '@/style/madrat-message-box.css';

const MAX_MENTION_OPTIONS = 8;

/** The `@query` being typed right before the caret, if any (names may contain spaces). */
export function activeMention(text: string, caret: number): { start: number; query: string; } | null
{
    const m = /(?:^|\s)@([^@\n]{0,30})$/.exec(text.slice(0, caret));
    return m ? { start: caret - m[ 1 ].length - 1, query: m[ 1 ] } : null;
}

export default function MadratMessageBox()
{
    const [ message, setMessage ] = useState<string>('');
    const [ isDirty, setIsDirty ] = useState(false);
    const [ isEditing, setIsEditing ] = useState(false);
    const dirtyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isFirstLoad = useRef(true);

    const { canEdit, addMessageHandler } = useAuth();
    const { students } = useStudents();
    const highlightNames = useMemo<HighlightedName[]>(() => students.map((s) => ({ id: s.hiveId, name: s.name, hint: s.room === 'Unknown' ? 'לא משובץ לחדר' : `חדר: ${s.room}` })), [ students ]);

    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const [ mention, setMention ] = useState<{ start: number; query: string; } | null>(null);
    const [ mentionIndex, setMentionIndex ] = useState(0);
    const mentionOptions = useMemo(() =>
    {
        if (!mention) return [];
        const q = mention.query.trim();
        return students.filter((s) => s.name.includes(q)).slice(0, MAX_MENTION_OPTIONS);
    }, [ mention, students ]);

    const slowLoadMessageData = useCallback(async () =>
    {
        return apiGetMadratMessage()
            .then((data) =>
            {
                if (isFirstLoad.current || !isDirty)
                {
                    setMessage(data);
                    isFirstLoad.current = false;
                }
            })
            .catch((error) =>
            {
                enqueueApiErrorSnackbar(enqueueSnackbar, 'טעינת הודעות המדר"ת נכשלה!', error);
            });
    }, [ setMessage, isDirty ]);

    // Handle live updates from the server
    const madratTextChangeHandler: MessageHandlerType = useCallback((messageType, data) =>
    {
        if (messageType !== MessageTypes.MADRAT_TEXT_UPDATE) return;
        if (!isDirty)
        {
            setMessage(data as string);
        }
    }, [ isDirty ]);

    // Apply a local edit: debounce isDirty and push to the server
    const applyValue = useCallback((value: string) =>
    {
        setMessage(value);
        setIsDirty(true);

        // Reset debounce timeout
        if (dirtyTimeoutRef.current)
        {
            clearTimeout(dirtyTimeoutRef.current);
        }
        dirtyTimeoutRef.current = setTimeout(() =>
        {
            setIsDirty(false);

        }, 1000); // 1 second(s) of inactivity

        apiPostMadratMessage(value).catch((error) =>
        {
            enqueueApiErrorSnackbar(enqueueSnackbar, 'שליחת הודעות מדר"ת נכשלה!', error);
        });
    }, []);

    const onTextChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback((event) =>
    {
        const { value, selectionStart } = event.target;
        applyValue(value);
        setMention(activeMention(value, selectionStart ?? value.length));
        setMentionIndex(0);
    }, [ applyValue ]);

    // Replace the typed `@query` with the student's plain name (rendered highlighted in the preview).
    const insertMention = useCallback((name: string) =>
    {
        const input = inputRef.current;
        if (!mention || !input) return;
        const caret = input.selectionStart ?? message.length;
        const value = `${message.slice(0, mention.start)}${name} ${message.slice(caret)}`;
        applyValue(value);
        setMention(null);
        const nextCaret = mention.start + name.length + 1;
        requestAnimationFrame(() => input.setSelectionRange(nextCaret, nextCaret));
    }, [ mention, message, applyValue ]);

    const onKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback((event) =>
    {
        if (!mention || mentionOptions.length === 0) return;
        switch (event.key)
        {
            case 'ArrowDown':
                event.preventDefault();
                setMentionIndex((i) => (i + 1) % mentionOptions.length);
                break;
            case 'ArrowUp':
                event.preventDefault();
                setMentionIndex((i) => (i - 1 + mentionOptions.length) % mentionOptions.length);
                break;
            case 'Enter':
            case 'Tab':
                event.preventDefault();
                insertMention(mentionOptions[ Math.min(mentionIndex, mentionOptions.length - 1) ].name);
                break;
            case 'Escape':
                event.preventDefault();
                setMention(null);
                break;
        }
    }, [ mention, mentionOptions, mentionIndex, insertMention ]);

    // Register message handler for server pushes
    useEffect(() =>
    {
        return addMessageHandler(madratTextChangeHandler);
    }, [ addMessageHandler, madratTextChangeHandler ]);

    // Load initial content from server
    useEffect(() =>
    {
        slowLoadMessageData();
    }, [ slowLoadMessageData ]);

    // Cleanup the timeout on unmount
    useEffect(() =>
    {
        return () =>
        {
            if (dirtyTimeoutRef.current)
            {
                clearTimeout(dirtyTimeoutRef.current);
            }
        };
    }, []);

    return (
        <Box
            className="relative rounded-sm w-full min-h-0 flex-1 box-border overflow-hidden flex flex-col"
            dir="rtl"
        >
            { isEditing && canEdit ? (<>
                <TextField
                    id="madrat-message-box"
                    type="text"
                    className="madrat-message-box"
                    fullWidth
                    multiline
                    autoFocus
                    onBlur={ () => { setIsEditing(false); setMention(null); } }
                    onKeyDown={ onKeyDown }
                    inputRef={ inputRef }
                    minRows={ 5 }
                    value={ message }
                    placeholder="אין הודעות..."
                    disabled={ !canEdit }
                    onChange={ onTextChange }
                    sx={ {
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                        overflowWrap: 'break-word',
                        overflowX: 'hidden',
                        '& .MuiInputBase-root': {
                            flex: 1,
                            alignItems: 'stretch',
                            minHeight: 0,
                        },
                        '& textarea': {
                            height: '100% !important',
                            overflow: 'auto !important',
                            boxSizing: 'border-box',
                        },
                    } }
                />
                <Popper open={ mentionOptions.length > 0 } anchorEl={ () => inputRef.current! } placement="bottom-start" sx={ { zIndex: 'modal' } }>
                    <Paper elevation={ 8 }>
                        <MenuList dense data-testid="mention-options" aria-label="בחירת חניך">
                            { mentionOptions.map((s, i) => (
                                <MenuItem
                                    key={ s.hiveId }
                                    selected={ i === mentionIndex }
                                    // mousedown, not click: keep focus in the textarea so onBlur doesn't leave edit mode.
                                    onMouseDown={ (e) => { e.preventDefault(); insertMention(s.name); } }
                                >
                                    <ListItemText primary={ s.name } secondary={ s.room } />
                                </MenuItem>
                            )) }
                        </MenuList>
                    </Paper>
                </Popper>
            </>) : (
                <Box
                    data-testid="madrat-message-preview"
                    role={ canEdit ? 'button' : undefined }
                    tabIndex={ canEdit ? 0 : undefined }
                    aria-label={ canEdit ? 'עריכת הודעת המדר"ת' : undefined }
                    onClick={ canEdit ? () => setIsEditing(true) : undefined }
                    onKeyDown={ canEdit ? (e) => { if (e.key === 'Enter') { e.preventDefault(); setIsEditing(true); } } : undefined }
                    sx={ {
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        paddingInline: '14px',
                        paddingBlock: '16.5px',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: canEdit ? 'text' : 'default',
                        '&:hover': canEdit ? { borderColor: 'text.primary' } : {},
                    } }
                >
                    { message
                        ? <MuiMarkdown highlightNames={ highlightNames }>{ message }</MuiMarkdown>
                        : <Box component="span" sx={ { color: 'text.disabled' } }>אין הודעות...</Box> }
                </Box>
            ) }
        </Box>
    );
}
