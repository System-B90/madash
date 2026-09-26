/**
 * Fixed-capacity cyclic buffer: once full, each push overwrites the oldest item
 * in place. Memory is bounded by `capacity` no matter how long the process runs.
 */
export class RingBuffer<T>
{
    private readonly items: T[];
    private start = 0;
    private count = 0;

    constructor(readonly capacity: number)
    {
        if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('RingBuffer capacity must be a positive integer');
        this.items = new Array<T>(capacity);
    }

    get size(): number
    {
        return this.count;
    }

    push(item: T): void
    {
        this.items[ (this.start + this.count) % this.capacity ] = item;
        if (this.count < this.capacity) this.count++;
        else this.start = (this.start + 1) % this.capacity;
    }

    clear(): void
    {
        this.items.fill(undefined as T);
        this.start = 0;
        this.count = 0;
    }

    /** Oldest → newest copy. */
    toArray(): T[]
    {
        const out = new Array<T>(this.count);
        for (let i = 0; i < this.count; i++) out[ i ] = this.items[ (this.start + i) % this.capacity ];
        return out;
    }
}
