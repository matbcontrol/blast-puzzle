export interface ScoreCounterFeel {
    /** The shown score closes this share of the gap every second, so a big gain runs fast and slows into place. */
    readonly catchUp: number;
    /**
     * Seconds the counter waits for popups to bring points in. After that it counts the rest in by itself,
     * so a popup that never lands (no effects wired, a redrawn board) cannot leave the number behind.
     */
    readonly creditWait: number;
}

/**
 * The number a score label shows. The model's score arrives first; the counter only runs up to the points
 * credited so far, so the number grows as each score popup lands in it.
 */
export class ScoreCounter {
    private total = 0;
    private credited = 0;
    private shownScore = 0;
    private waited = 0;

    constructor(private readonly feel: ScoreCounterFeel) {}

    get shown(): number {
        return this.shownScore;
    }

    /** Shows this score at once, with nothing left to count. */
    reset(score: number): void {
        this.total = score;
        this.credited = score;
        this.shownScore = score;
        this.waited = 0;
    }

    /** The model's score. Credits never run past it. */
    setTotal(score: number): void {
        this.total = score;
        this.credited = Math.min(this.credited, score);
        this.waited = 0;
    }

    /** Points that landed in the label: the count may run up to them now. */
    credit(points: number): void {
        this.credited = Math.min(this.total, this.credited + points);
        this.waited = 0;
    }

    /** Counts up to the model's score without waiting for anything. */
    creditAll(): void {
        this.credited = this.total;
    }

    /** Advances the count. Returns whether the shown score changed. */
    step(dt: number): boolean {
        if (this.credited < this.total) {
            this.waited += dt;
            if (this.waited >= this.feel.creditWait) {
                this.creditAll();
            }
        }
        const gap = this.credited - this.shownScore;
        if (gap === 0) {
            return false;
        }
        const step = Math.max(1, Math.ceil(Math.abs(gap) * Math.min(1, dt * this.feel.catchUp)));
        this.shownScore += gap > 0 ? Math.min(gap, step) : Math.max(gap, -step);
        return true;
    }
}
