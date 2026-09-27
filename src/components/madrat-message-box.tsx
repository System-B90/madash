'use client';

import { Box, ListItemIcon, ListItemText, ListSubheader, MenuItem, MenuList, Paper, Popper, TextField } from "@mui/material";
import { enqueueSnackbar } from 'notistack';
import { ChangeEventHandler, Fragment, KeyboardEventHandler, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { enqueueApiErrorSnackbar } from '@/api-client/common';
import { apiGetMadratMessage, apiPostMadratMessage } from '@/api-client/madrat';
import { MENTION_KIND_LABELS, type MentionDirectory, type MentionEntity, searchMentions, STATUS_LABELS } from '@/api-shared/mentions';
import { useAuth } from '@/components/auth-provider';
import { caretRect } from '@/components/mentions/caret-rect';
import MentionChip from '@/components/mentions/mention-chip';
import { MENTION_KIND_STYLE } from '@/components/mentions/mention-kinds';
import { useMentionDirectory } from '@/components/mentions/use-mention-directory';
import MuiMarkdown from '@/components/mui-markdown';
import { MessageHandlerType } from '@/components/session-ws';
import { MessageTypes } from '@/settings';
import '@/style/madrat-message-box.css';

/** One-line context under each picker option, so same-looking names are easy to tell apart. */
function mentionHint(entity: MentionEntity, dir: MentionDirectory): string
{
    switch (entity.kind)
    {
        case 'student':
        {
            const rooms = dir.roomsOf(entity.id).map((r) => r.name);
            return rooms.length ? rooms.join(', ') : 'לא משובץ לחדר';
        }
        case 'room':
        case 'group':
            return `${dir.membersOf(entity.id).students.length} חניכים`;
        case 'segel':
        case 'checker':
        {
            const person = dir.person(entity.id);
            return person ? STATUS_LABELS[ person.status ] : '';
        }
    }
}

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
    // Read by async callbacks: a fetch started before the writer began typing must not see a stale `false`.
    const isDirtyRef = useRef(false);
    const [ isEditing, setIsEditing ] = useState(false);
    const dirtyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { canEdit, addMessageHandler } = useAuth();
    const directory = useMentionDirectory();
    const renderHighlight = useCallback((key: string, children: ReactNode) =>
    {
        const entity = directory.byKey.get(key);
        return entity ? <MentionChip entity={ entity } dir={ directory }>{ children }</MentionChip> : children;
    }, [ directory ]);

    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const [ mention, setMention ] = useState<{ start: number; query: string; } | null>(null);
    const [ mentionIndex, setMentionIndex ] = useState(0);
    const mentionOptions = useMemo(() =>
    {
        if (!mention) return [];
        return searchMentions(directory.entities, mention.query);
    }, [ mention, directory ]);

    const slowLoadMessageData = useCallback(async () =>
    {
        return apiGetMadratMessage()
            .then((data) =>
            {
                // Never clobber text the writer has already started typing.
                if (!isDirtyRef.current)
                {
                    setMessage(data);
                }
            })
            .catch((error) =>
            {
                enqueueApiErrorSnackbar(enqueueSnackbar, 'טעינת הודעות המדר"ת נכשלה!', error);
            });
    }, [ setMessage ]);

    // Handle live updates from the server
    const madratTextChangeHandler: MessageHandlerType = useCallback((messageType, data) =>
    {
        if (messageType !== MessageTypes.MADRAT_TEXT_UPDATE) return;
        if (!isDirtyRef.current)
        {
            setMessage(data as string);
        }
    }, []);

    // Apply a local edit: debounce isDirty and push to the server
    const applyValue = useCallback((value: string) =>
    {
        setMessage(value);
        isDirtyRef.current = true;
        setIsDirty(true);

        // Reset debounce timeout
        if (dirtyTimeoutRef.current)
        {
            clearTimeout(dirtyTimeoutRef.current);
        }
        dirtyTimeoutRef.current = setTimeout(() =>
        {
            isDirtyRef.current = false;
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

    // Replace the typed `@query` with the tagged name as plain text (rendered highlighted in the preview).
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

    // Keep the keyboard-selected option visible in the (scrollable) picker.
    useEffect(() =>
    {
        document.querySelector('[data-testid=mention-options] .Mui-selected')?.scrollIntoView({ block: 'nearest' });
    }, [ mentionIndex ]);

    // Register message handler for server pushes
    useEffect(() =>
    {
        return addMessageHandler(madratTextChangeHandler);
    }, [ addMessageHandler, madratTextChangeHandler ]);

    // Load on mount, and re-sync once the writer pauses (picks up edits pushed meanwhile)
    useEffect(() =>
    {
        if (!isDirty) slowLoadMessageData();
    }, [ isDirty, slowLoadMessageData ]);

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
                <Popper
                    open={ mentionOptions.length > 0 }
                    // Open at the `@` being typed, not at the (tall) textarea's edge.
                    anchorEl={ mention ? { getBoundingClientRect: () => caretRect(inputRef.current!, mention.start) } : null }
                    placement="bottom-start"
                    modifiers={ [ { name: 'flip', enabled: true }, { name: 'preventOverflow', options: { padding: 8 } } ] }
                    sx={ { zIndex: 'modal' } }
                >
                    <Paper elevation={ 8 }>
                        <MenuList dense data-testid="mention-options" aria-label="תיוג" sx={ { maxHeight: 360, overflowY: 'auto', minWidth: 260 } }>
                            { mentionOptions.map((entity, i) =>
                            {
                                const { icon: Icon, palette } = MENTION_KIND_STYLE[ entity.kind ];
                                const firstOfKind = i === 0 || mentionOptions[ i - 1 ].kind !== entity.kind;
                                return (
                                    <Fragment key={ entity.key }>
                                        { firstOfKind && <ListSubheader sx={ { lineHeight: '28px' } }>{ MENTION_KIND_LABELS[ entity.kind ] }</ListSubheader> }
                                        <MenuItem
                                            data-kind={ entity.kind }
                                            selected={ i === mentionIndex }
                                            // mousedown, not click: keep focus in the textarea so onBlur doesn't leave edit mode.
                                            onMouseDown={ (e) => { e.preventDefault(); insertMention(entity.name); } }
                                        >
                                            <ListItemIcon sx={ { color: `${palette}.main` } }><Icon fontSize="small" /></ListItemIcon>
                                            <ListItemText primary={ entity.name } secondary={ mentionHint(entity, directory) } />
                                        </MenuItem>
                                    </Fragment>
                                );
                            }) }
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
                        ? <MuiMarkdown highlights={ directory.highlightable } renderHighlight={ renderHighlight }>{ message }</MuiMarkdown>
                        : <Box component="span" sx={ { color: 'text.disabled' } }>אין הודעות...</Box> }
                </Box>
            ) }
        </Box>
    );
}
