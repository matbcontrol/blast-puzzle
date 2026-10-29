import { CellRelease } from '../CellRelease';
import { Clock } from '../Clock';

/** Keeps the latest tap for `lifetime` seconds. Replayed later, it would act on a board the player no longer sees. */
export class TapBuffer {
    private kept: CellRelease | null = null;
    private cancelExpiry: (() => void) | null = null;

    constructor(
        private readonly clock: Clock,
        private readonly lifetime: number,
    ) {}

    hold(tap: CellRelease): void {
        this.clear();
        this.kept = tap;
        this.cancelExpiry = this.clock.schedule(this.lifetime, () => {
            this.kept = null;
            this.cancelExpiry = null;
        });
    }

    /** The kept tap, once. */
    take(): CellRelease | null {
        const tap = this.kept;
        this.clear();
        return tap;
    }

    clear(): void {
        if (this.cancelExpiry !== null) {
            this.cancelExpiry();
            this.cancelExpiry = null;
        }
        this.kept = null;
    }
}
