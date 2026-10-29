import { SuperCreatedStep } from '../../core/game/TurnStep';
import { Feel } from './Feel';
import { playTween, StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/** The super tile pops out of the collapsed group with a sparkle. */
export class SuperCreatedAnimator implements StepAnimator<'superCreated'> {
    readonly type = 'superCreated';

    async play(step: SuperCreatedStep, stage: TileStage): Promise<void> {
        const node = stage.spawn(step.tile, step.at.col, step.at.row);
        node.scale = 0;
        stage.bringToFront(node);
        stage.effects.burst(stage.layout.cellCenter(step.at.col, step.at.row), null, Feel.superSparkle);
        stage.sound.play('superCreate');
        await playTween(
            node,
            cc
                .tween(node)
                .to(Timings.superGrow, { scale: Feel.superGrowScale }, { easing: 'backOut' })
                .to(Timings.superSettle, { scale: 1 }, { easing: 'sineInOut' }),
        );
        stage.sortByRow(node, step.at.row);
    }
}
