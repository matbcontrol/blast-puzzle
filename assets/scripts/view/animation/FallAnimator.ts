import { FallStep } from '../../core/game/TurnStep';
import { dropNode, landingThud } from './DropMotion';
import { StepAnimator } from './StepAnimator';
import { TurnStage } from './TileStage';

/** Each column falls as one stack once its burn is over. Every tile falls with the same gravity. */
export class FallAnimator implements StepAnimator<'fall'> {
    readonly type = 'fall';

    async play(step: FallStep, stage: TurnStage): Promise<void> {
        const onLand = landingThud(stage);
        await Promise.all(
            step.moves.map(async (move) => {
                await stage.columnSettled(move.to.col);
                const node = stage.nodeOf(move.tileId);
                stage.sortByRow(node, move.to.row);
                const target = stage.layout.cellCenter(move.to.col, move.to.row);
                await dropNode(node, target, move.from.row - move.to.row, 0, onLand);
            }),
        );
    }
}
