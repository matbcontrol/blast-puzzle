import { InputState } from './InputState';

/**
 * While the level is dealt and its goal announced, a tap or a booster press only sends the banner away.
 * The tap itself is not played: the band covers the middle rows, and a tap meant to skip it must not burn a group.
 */
export class IntroInput implements InputState {
    readonly offersHint = false;
    readonly acceptsTaps = false;

    constructor(private readonly skipBanner: () => void) {}

    enter(): void {}

    exit(): void {}

    onCellReleased(): void {
        this.skipBanner();
    }

    onCellPointed(): void {}

    onBoosterPressed(): void {
        this.skipBanner();
    }
}
