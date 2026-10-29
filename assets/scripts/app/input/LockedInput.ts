import { InputState } from './InputState';

/** Swallows input while the level is announced, a turn is animating or the level is over. */
export class LockedInput implements InputState {
    readonly offersHint = false;

    enter(): void {}

    onCellTapped(): void {}

    onCellPointed(): void {}

    onBoosterPressed(): void {}
}
