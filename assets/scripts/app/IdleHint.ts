import { GridPos } from '../core/board/GridPos';
import { Clock } from './Clock';
import { BoardCues } from './GameViews';

/** Seconds without input before the board suggests a move. */
export const HINT_DELAY = 5;

/** Suggests a move once the player has been idle for HINT_DELAY, and takes it back on the next input. */
export class IdleHint {
    private cancelTimer: (() => void) | null = null;
    private shown = false;

    constructor(
        private readonly clock: Clock,
        private readonly findMove: () => ReadonlyArray<GridPos> | null,
        private readonly cues: Pick<BoardCues, 'showHint' | 'clearHint'>,
    ) {}

    /** Starts waiting from now. A hint already on the board goes away. */
    restart(): void {
        this.stop();
        this.cancelTimer = this.clock.schedule(HINT_DELAY, () => this.show());
    }

    stop(): void {
        if (this.cancelTimer !== null) {
            this.cancelTimer();
            this.cancelTimer = null;
        }
        if (this.shown) {
            this.shown = false;
            this.cues.clearHint();
        }
    }

    private show(): void {
        this.cancelTimer = null;
        const cells = this.findMove();
        if (cells !== null) {
            this.shown = true;
            this.cues.showHint(cells);
        }
    }
}
