/** Mirrored textarea styles that affect where text wraps and lands. */
const MIRRORED = [
    'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight', 'fontFamily',
    'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'direction', 'tabSize',
] as const;

/**
 * Viewport rect of the caret at `position` in a textarea (zero width, one line tall),
 * via an off-screen mirror element — so a popup can open right where the user types.
 */
export function caretRect(textarea: HTMLTextAreaElement, position: number): DOMRect
{
    const style = getComputedStyle(textarea);
    const mirror = document.createElement('div');
    for (const prop of MIRRORED) mirror.style[ prop ] = style[ prop ];
    Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', top: '0', left: '-9999px' });
    mirror.textContent = textarea.value.slice(0, position);
    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const box = textarea.getBoundingClientRect();
    const x = box.left + marker.offsetLeft - textarea.scrollLeft;
    const y = box.top + marker.offsetTop - textarea.scrollTop;
    const height = marker.offsetHeight || parseFloat(style.lineHeight) || 20;
    document.body.removeChild(mirror);
    return new DOMRect(x, y, 0, height);
}
