/**
 * Rolling window of recent response times. The board judges performance on the
 * median, so a single slow probe (GC pause, cold cache) doesn't flap the tile.
 */
export class LatencyWindow
{
    private readonly samples: number[] = [];

    constructor(private readonly size = 5) { }

    push(latencyMs: number): void
    {
        this.samples.push(latencyMs);
        if (this.samples.length > this.size) this.samples.shift();
    }

    clear(): void
    {
        this.samples.length = 0;
    }

    median(): number | null
    {
        if (this.samples.length === 0) return null;
        const sorted = [ ...this.samples ].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[ mid ] : Math.round((sorted[ mid - 1 ] + sorted[ mid ]) / 2);
    }
}
