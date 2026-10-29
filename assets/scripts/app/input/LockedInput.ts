import { InputState } from './InputState';

/** Swallows input while a turn is animating or the level is over. */
export class LockedInput implements InputState {
    enter(): void {}

    onCellTapped(): void {}

    onBoosterPressed(): void {}
}
