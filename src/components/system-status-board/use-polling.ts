'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Calls `fetcher` now and every `intervalMs`, handing each result to `onValue`.
 * A rejected fetch maps through `onError` so one failing probe never leaves a
 * tile stuck on "loading". Returns a stop function; no result is delivered after it.
 */
export function startPolling<T>(
    fetcher: () => Promise<T>,
    intervalMs: number,
    onError: (e: unknown) => T,
    onValue: (value: T) => void,
): () => void
{
    let alive = true;
    const tick = async () =>
    {
        let next: T;
        try
        {
            next = await fetcher();
        }
        catch (e)
        {
            next = onError(e);
        }
        if (alive) onValue(next);
    };

    tick();
    const interval = setInterval(tick, intervalMs);
    return () =>
    {
        alive = false;
        clearInterval(interval);
    };
}

/** React binding for `startPolling`; `null` until the first result arrives. */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number, onError: (e: unknown) => T): T | null
{
    const [ value, setValue ] = useState<T | null>(null);
    // Latest callbacks without restarting the interval on every render.
    const fetcherRef = useRef(fetcher);
    const onErrorRef = useRef(onError);
    useEffect(() =>
    {
        fetcherRef.current = fetcher;
        onErrorRef.current = onError;
    });

    useEffect(
        () => startPolling(() => fetcherRef.current(), intervalMs, (e) => onErrorRef.current(e), setValue),
        [ intervalMs ],
    );

    return value;
}
