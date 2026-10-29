/**
 * Holds what was asked for between the gesture that resumes the audio context and the browser confirming it.
 * On a phone the first tap is that gesture, so without this the first tap of the game would be silent.
 */
export class ResumeQueue<T> {
    private readonly held: { readonly item: T; readonly at: number }[] = [];

    constructor(
        /** Older than this, a sound would land visibly after its picture and is better dropped. */
        private readonly maxAgeMs: number,
        private readonly capacity: number,
    ) {}

    push(item: T, nowMs: number): void {
        this.held.push({ item, at: nowMs });
        if (this.held.length > this.capacity) {
            this.held.shift();
        }
    }

    /** Empties the queue and returns what is still recent enough, oldest first. */
    drain(nowMs: number): T[] {
        const fresh = this.held.filter((entry) => nowMs - entry.at <= this.maxAgeMs).map((entry) => entry.item);
        this.held.length = 0;
        return fresh;
    }

    clear(): void {
        this.held.length = 0;
    }
}
