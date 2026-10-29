import { SwapStep } from '../../core/game/TurnStep';
import { playTween, StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

export class SwapAnimator implements StepAnimator<'swap'> {
    readonly type = 'swap';

    async play(step: SwapStep, stage: TileStage): Promise<void> {
        await Promise.all(
            step.moves.map((move) => {
                const node = stage.nodeOf(move.tileId);
                const target = stage.layout.cellCenter(move.to.col, move.to.row);
                stage.sortByRow(node, move.to.row);
                stage.bringToFront(node);
                return Promise.all([
                    playTween(
                        node,
                        cc
                            .tween(node)
                            .to(Timings.swap, { position: cc.v3(target.x, target.y, 0) }, { easing: 'sineInOut' }),
                    ),
                    playTween(
                        node,
                        cc
                            .tween(node)
                            .to(Timings.swap / 2, { scale: 1.25 }, { easing: 'sineOut' })
                            .to(Timings.swap / 2, { scale: 1 }, { easing: 'sineIn' }),
                    ),
                ]).then(() => stage.sortByRow(node, move.to.row));
            }),
        );
    }
}
