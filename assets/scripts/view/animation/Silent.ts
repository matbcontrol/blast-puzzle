import { BoardEffects } from '../fx/BoardEffects';
import { SoundBoard } from '../audio/SoundBoard';

/** Stand-ins until the scene wires real effects and sound, so the board plays without them. */
export class NoEffects implements BoardEffects {
    burst(): void {}

    scorePopup(): void {}

    praise(): void {}

    shockwave(): void {}

    flash(): void {}

    rocket(): Promise<void> {
        return Promise.resolve();
    }

    confetti(): void {}
}

export class NoSound implements SoundBoard {
    muted = false;

    play(): void {}

    setMuted(muted: boolean): void {
        this.muted = muted;
    }
}
