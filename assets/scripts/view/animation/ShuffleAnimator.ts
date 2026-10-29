import { ShuffleStep } from '../../core/game/TurnStep';
import { playTween, StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

export class ShuffleAnimator implements StepAnimator<'shuffle'> {
    readonly type = 'shuffle';

    async play(step: ShuffleStep, stage: TileStage): Promise<void> {
        const half = Timings.shuffle / 2;
        await Promise.all(
            step.moves.map((move) => {
                const node = stage.nodeOf(move.tileId);
                const target = stage.layout.cellCenter(move.to.col, move.to.row);
                stage.sortByRow(node, move.to.row);
                return playTween(
                    node,
                    cc
                        .tween(node)
                        .to(half, { scale: 0.6, angle: 180 }, { easing: 'sineIn' })
                        .to(
                            half,
                            { position: cc.v3(target.x, target.y, 0), scale: 1, angle: 360 },
                            { easing: 'sineOut' },
                        )
                        .set({ angle: 0 }),
                );
            }),
        );
    }
}
