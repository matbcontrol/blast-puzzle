import { TileMove } from '../../core/board/Gravity';
import { SwapStep } from '../../core/game/TurnStep';
import { arcTo } from './ArcMotion';
import { Feel } from './Feel';
import { playTween, StepAnimator } from './StepAnimator';
import { TurnStage } from './TileStage';
import { Timings } from './Timings';

/** The two tiles trade places on arcs that pass each other and land with a sparkle. */
export class SwapAnimator implements StepAnimator<'swap'> {
    readonly type = 'swap';

    async play(step: SwapStep, stage: TurnStage): Promise<void> {
        stage.sound.play('swap');
        await Promise.all(step.moves.map((move) => this.fly(move, stage)));
    }

    private async fly(move: TileMove, stage: TurnStage): Promise<void> {
        const node = stage.nodeOf(move.tileId);
        const from = stage.layout.cellCenter(move.from.col, move.from.row);
        const to = stage.layout.cellCenter(move.to.col, move.to.row);
        const half = Timings.swap / 2;
        stage.bringToFront(node);
        await Promise.all([
            playTween(node, arcTo(node, from, to, Feel.swapArc, Timings.swap)),
            playTween(
                node,
                cc
                    .tween(node)
                    .to(half, { scale: Feel.swapScale }, { easing: 'sineOut' })
                    .to(half, { scale: 1 }, { easing: 'sineIn' }),
            ),
        ]);
        stage.effects.burst(to, null, Feel.swapSparkle);
        stage.sortByRow(node, move.to.row);
    }
}
