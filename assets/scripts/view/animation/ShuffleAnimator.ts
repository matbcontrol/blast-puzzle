import { TileMove } from '../../core/board/Gravity';
import { ShuffleStep } from '../../core/game/TurnStep';
import { Texts } from '../Texts';
import { Feel } from './Feel';
import { playTween, StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/** The tiles spin into a swirl around the board center and fly out to their new cells. */
export class ShuffleAnimator implements StepAnimator<'shuffle'> {
    readonly type = 'shuffle';

    async play(step: ShuffleStep, stage: TileStage): Promise<void> {
        stage.sound.play('shuffle');
        stage.effects.praise(Texts.praise.shuffle);
        await Promise.all(step.moves.map((move) => this.reshuffle(move, stage)));
    }

    private reshuffle(move: TileMove, stage: TileStage): Promise<void> {
        const node = stage.nodeOf(move.tileId);
        const from = stage.layout.cellCenter(move.from.col, move.from.row);
        const to = stage.layout.cellCenter(move.to.col, move.to.row);
        // Layout points are relative to the board center, so scaling one down pulls it towards the center.
        const keep = 1 - Feel.shuffleGather;
        const swirl = cc.v3(from.x * keep, from.y * keep, 0);
        stage.sortByRow(node, move.to.row);
        return playTween(
            node,
            cc
                .tween(node)
                .to(
                    Timings.shuffleGather,
                    { position: swirl, scale: Feel.shuffleScale, angle: Feel.shuffleSpin },
                    { easing: 'quadIn' },
                )
                .delay(Timings.shuffleHold)
                .to(
                    Timings.shuffleScatter,
                    { position: cc.v3(to.x, to.y, 0), scale: 1, angle: 2 * Feel.shuffleSpin },
                    { easing: 'backOut' },
                )
                .set({ angle: 0 }),
        );
    }
}
