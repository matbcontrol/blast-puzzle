import { SuperCreatedStep } from '../../core/game/TurnStep';
import { playTween, StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

export class SuperCreatedAnimator implements StepAnimator<'superCreated'> {
    readonly type = 'superCreated';

    play(step: SuperCreatedStep, stage: TileStage): Promise<void> {
        const node = stage.spawn(step.tile, step.at.col, step.at.row);
        node.scale = 0;
        return playTween(
            node,
            cc
                .tween(node)
                .to(Timings.superAppear * 0.7, { scale: 1.3 }, { easing: 'backOut' })
                .to(Timings.superAppear * 0.3, { scale: 1 }),
        );
    }
}
