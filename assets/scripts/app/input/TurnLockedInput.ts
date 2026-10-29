import { CellRelease, isTap } from '../CellRelease';
import { InputState } from './InputState';
import { TapBuffer } from './TapBuffer';

/** A turn animates: nothing plays now, but the latest tap is kept to be replayed once the board rests. */
export class TurnLockedInput implements InputState {
    readonly offersHint = false;
    readonly acceptsTaps = true;

    constructor(private readonly taps: TapBuffer) {}

    enter(): void {}

    exit(): void {}

    onCellReleased(release: CellRelease): void {
        if (isTap(release)) {
            this.taps.hold(release);
        }
    }

    onCellPointed(): void {}

    /** A booster press means the player has changed their mind about the kept tap. */
    onBoosterPressed(): void {
        this.taps.clear();
    }
}
