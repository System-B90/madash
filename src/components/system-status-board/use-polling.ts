'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Calls `fetcher` now and every `intervalMs`, exposing the latest value.
 * A rejected fetch maps through `onError` so one failing probe never leaves a
 * tile stuck on "loading". `null` until the first result arrives.
 */
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

    useEffect(() =>
    {
        let alive = true;
        const tick = async () =>
        {
            let next: T;
            try
            {
                next = await fetcherRef.current();
            }
            catch (e)
            {
                next = onErrorRef.current(e);
            }
            if (alive) setValue(next);
        };

        tick();
        const interval = setInterval(tick, intervalMs);
        return () =>
        {
            alive = false;
            clearInterval(interval);
        };
    }, [ intervalMs ]);

    return value;
}
