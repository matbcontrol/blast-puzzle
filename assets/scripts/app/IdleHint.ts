import { GridPos } from '../core/board/GridPos';
import { Clock } from './Clock';
import { BoardCues } from './GameViews';

/** Suggests a move once the player has been idle for `delay` seconds, and takes it back on the next input. */
export class IdleHint {
    private cancelTimer: (() => void) | null = null;
    private shown = false;

    constructor(
        private readonly clock: Clock,
        private readonly delay: number,
        private readonly findMove: () => ReadonlyArray<GridPos>,
        private readonly cues: Pick<BoardCues, 'showHint'>,
    ) {}

    /** Starts waiting from now. A hint already on the board goes away. */
    restart(): void {
        this.stop();
        this.cancelTimer = this.clock.schedule(this.delay, () => this.show());
    }

    stop(): void {
        if (this.cancelTimer !== null) {
            this.cancelTimer();
            this.cancelTimer = null;
        }
        if (this.shown) {
            this.shown = false;
            this.cues.showHint([]);
        }
    }

    private show(): void {
        this.cancelTimer = null;
        const cells = this.findMove();
        if (cells.length > 0) {
            this.shown = true;
            this.cues.showHint(cells);
        }
    }
}
