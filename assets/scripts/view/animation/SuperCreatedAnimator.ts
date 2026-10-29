import { SuperCreatedStep } from '../../core/game/TurnStep';
import { earnedPraise } from './Praise';
import { StepAnimator } from './StepAnimator';
import { revealSuper } from './SuperReveal';
import { TurnStage } from './TileStage';

/** The super tile pops out of the collapsed group, and a strong one is praised as it appears. */
export class SuperCreatedAnimator implements StepAnimator<'superCreated'> {
    readonly type = 'superCreated';

    play(step: SuperCreatedStep, stage: TurnStage): Promise<void> {
        const praise = earnedPraise(step.tile.requireSuperKind());
        if (praise !== null) {
            stage.effects.praise(praise);
        }
        return revealSuper(stage, step.tile, step.at);
    }
}
