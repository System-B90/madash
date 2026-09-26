import { RingBuffer } from '@/api-shared/ring-buffer';
import type { LatencySample } from '@/api-shared/service-health';

/**
 * Rolling window of recent response times. The board judges performance on the
 * median, so a single slow probe (GC pause, cold cache) doesn't flap the tile.
 */
export class LatencyWindow
{
    private readonly samples: RingBuffer<number>;

    constructor(size = 5)
    {
        this.samples = new RingBuffer(size);
    }

    push(latencyMs: number): void
    {
        this.samples.push(latencyMs);
    }

    clear(): void
    {
        this.samples.clear();
    }

    median(): number | null
    {
        if (this.samples.size === 0) return null;
        const sorted = this.samples.toArray().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[ mid ] : Math.round((sorted[ mid - 1 ] + sorted[ mid ]) / 2);
    }
}

/**
 * Cyclic record of every probe (raw, not smoothed) for the latency graph: the
 * oldest sample is overwritten once full. In-process only, like the rest of
 * madash's state.
 */
export class LatencyHistory
{
    private readonly samples: RingBuffer<LatencySample>;

    constructor(size = 60)
    {
        this.samples = new RingBuffer(size);
    }

    push(sample: LatencySample): void
    {
        this.samples.push(sample);
    }

    snapshot(): LatencySample[]
    {
        return this.samples.toArray();
    }
}
