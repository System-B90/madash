'use client';

import { Box, Checkbox, Divider, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { Element, ElementContent, Root } from 'hast';
import { type ReactNode, useMemo } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Highlight
{
    /** Opaque id handed back to `renderHighlight`. */
    key: string;
    name: string;
}

const SKIP_TAGS = new Set([ 'code', 'pre', 'a' ]);
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NO_HIGHLIGHTS: Highlight[] = [];

/** Rehype plugin: wraps every occurrence of a known name in `<span data-highlight-key>` (not inside code or links). */
function rehypeHighlightNames(names: Highlight[])
{
    const byName = new Map(names.filter((n) => n.name.trim()).map((n) => [ n.name, n ]));
    // Longest first, so "דנה כהן לוי" wins over "דנה כהן".
    const pattern = byName.size
        ? new RegExp([ ...byName.keys() ].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|'), 'g')
        : null;

    const split = (value: string): ElementContent[] =>
    {
        const out: ElementContent[] = [];
        let last = 0;
        for (const m of value.matchAll(pattern!))
        {
            if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
            out.push({ type: 'element', tagName: 'span', properties: { dataHighlightKey: byName.get(m[ 0 ])!.key }, children: [ { type: 'text', value: m[ 0 ] } ] });
            last = m.index + m[ 0 ].length;
        }
        if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
        return out;
    };

    const walk = (node: Root | Element) =>
    {
        node.children = (node.children as ElementContent[]).flatMap((child): ElementContent[] =>
        {
            if (child.type === 'text') return split(child.value);
            if (child.type === 'element' && !SKIP_TAGS.has(child.tagName)) walk(child);
            return [ child ];
        }) as typeof node.children;
    };

    return () => (tree: Root) => { if (pattern) walk(tree); };
}

/**
 * Markdown elements rendered as MUI components, so the output inherits the MADASH
 * theme (typography, palette, light/dark) from the ThemeProvider with no own colours.
 */
const COMPONENTS: Components = {
    h1: ({ children }) => <Typography variant="h5" component="h1" fontWeight={ 700 } gutterBottom>{ children }</Typography>,
    h2: ({ children }) => <Typography variant="h6" component="h2" fontWeight={ 700 } gutterBottom>{ children }</Typography>,
    h3: ({ children }) => <Typography variant="subtitle1" component="h3" fontWeight={ 700 } gutterBottom>{ children }</Typography>,
    h4: ({ children }) => <Typography variant="subtitle2" component="h4" fontWeight={ 700 } gutterBottom>{ children }</Typography>,
    h5: ({ children }) => <Typography variant="subtitle2" component="h5" gutterBottom>{ children }</Typography>,
    h6: ({ children }) => <Typography variant="subtitle2" component="h6" gutterBottom>{ children }</Typography>,
    p: ({ children }) => <Typography variant="body1" component="p" sx={ { marginBlock: 0.75 } }>{ children }</Typography>,
    // Links open without also toggling an enclosing click-to-edit surface.
    a: ({ href, children }) => <Link href={ href } target="_blank" rel="noopener noreferrer" onClick={ (e) => e.stopPropagation() }>{ children }</Link>,
    // Explicit list styles: the Tailwind preflight resets them to none.
    ul: ({ children }) => <Box component="ul" sx={ { listStyleType: 'disc', paddingInlineStart: 3, marginBlock: 0.75 } }>{ children }</Box>,
    ol: ({ children }) => <Box component="ol" sx={ { listStyleType: 'decimal', paddingInlineStart: 3, marginBlock: 0.75 } }>{ children }</Box>,
    li: ({ children }) => <Typography component="li" variant="body1">{ children }</Typography>,
    blockquote: ({ children }) => (
        <Box component="blockquote" sx={ { marginInline: 0, paddingInlineStart: 2, borderInlineStart: '3px solid', borderColor: 'secondary.main', color: 'text.secondary' } }>
            { children }
        </Box>
    ),
    code: ({ children }) => (
        <Box component="code" sx={ { fontFamily: 'monospace', fontSize: '0.9em', paddingInline: 0.5, borderRadius: 0.5, bgcolor: 'action.hover' } }>{ children }</Box>
    ),
    pre: ({ children }) => (
        <Box component="pre" dir="ltr" sx={ { p: 1.5, borderRadius: 1, overflowX: 'auto', bgcolor: 'action.hover', '& code': { p: 0, bgcolor: 'transparent' } } }>
            { children }
        </Box>
    ),
    hr: () => <Divider sx={ { marginBlock: 1.5 } } />,
    table: ({ children }) => <TableContainer sx={ { marginBlock: 1 } }><Table size="small">{ children }</Table></TableContainer>,
    thead: ({ children }) => <TableHead>{ children }</TableHead>,
    tbody: ({ children }) => <TableBody>{ children }</TableBody>,
    tr: ({ children }) => <TableRow>{ children }</TableRow>,
    th: ({ children }) => <TableCell sx={ { fontWeight: 700 } }>{ children }</TableCell>,
    td: ({ children }) => <TableCell>{ children }</TableCell>,
    input: ({ type, checked }) => (type === 'checkbox'
        ? <Checkbox size="small" checked={ !!checked } disabled sx={ { p: 0, marginInlineEnd: 0.5 } } />
        : null),
};

export default function MuiMarkdown({ children, highlights = NO_HIGHLIGHTS, renderHighlight }: {
    children: string;
    /** Names to mark up wherever they appear in the text. */
    highlights?: Highlight[];
    renderHighlight?: (key: string, children: ReactNode) => ReactNode;
})
{
    const rehypePlugins = useMemo(() => [ rehypeHighlightNames(highlights) ], [ highlights ]);
    const components = useMemo<Components>(() => ({
        ...COMPONENTS,
        span: ({ node: _node, children: spanChildren, ...props }) =>
        {
            const { 'data-highlight-key': key, ...rest } = props as Record<string, unknown>;
            if (typeof key === 'string' && renderHighlight) return renderHighlight(key, spanChildren);
            return <span { ...rest }>{ spanChildren }</span>;
        },
    }), [ renderHighlight ]);
    return (
        <Box sx={ { color: 'text.primary', overflowWrap: 'break-word', '& > :first-child': { marginBlockStart: 0 }, '& > :last-child': { marginBlockEnd: 0 } } }>
            <Markdown remarkPlugins={ [ remarkGfm ] } rehypePlugins={ rehypePlugins } components={ components }>{ children }</Markdown>
        </Box>
    );
}
