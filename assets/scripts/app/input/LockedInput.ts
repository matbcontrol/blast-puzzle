import { InputState } from './InputState';

/** Swallows input during the bonus round, under the result panel and once the controller is disposed. */
export class LockedInput implements InputState {
    readonly offersHint = false;
    readonly acceptsTaps = false;

    enter(): void {}

    exit(): void {}

    onCellReleased(): void {}

    onCellPointed(): void {}

    onBoosterPressed(): void {}
}
