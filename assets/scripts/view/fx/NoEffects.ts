import { BoardEffects } from './BoardEffects';

/** Draws nothing: the board plays without effects until GameBootstrap hands it the real ones. */
export class NoEffects implements BoardEffects {
    burst(): void {}

    scorePopup(): void {}

    praise(): void {}

    shockwave(): void {}

    flash(): void {}

    rocket(): void {}
}
