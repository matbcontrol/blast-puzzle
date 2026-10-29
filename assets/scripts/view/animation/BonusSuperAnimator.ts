import { BonusSuperStep } from '../../core/game/TurnStep';
import { Feel } from './Feel';
import { popTile, PopStyles } from './PopMotion';
import { StepAnimator } from './StepAnimator';
import { revealSuper } from './SuperReveal';
import { TurnStage } from './TileStage';

/** A leftover move after the win: the picked tile pops bright, and a super tile appears in its place. */
export class BonusSuperAnimator implements StepAnimator<'bonusSuper'> {
    readonly type = 'bonusSuper';

    async play(step: BonusSuperStep, stage: TurnStage): Promise<void> {
        await popTile(stage, { tile: step.replaced, at: step.at }, 0, PopStyles.bonus, Feel.bonusBurst);
        await revealSuper(stage, step.tile, step.at);
    }
}
