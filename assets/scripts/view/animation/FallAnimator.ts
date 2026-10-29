import { FallStep } from '../../core/game/TurnStep';
import { dropNode, landingThud } from './DropMotion';
import { StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';

/** Everything starts at once and falls with the same gravity, so a column drops as a stack. */
export class FallAnimator implements StepAnimator<'fall'> {
    readonly type = 'fall';

    async play(step: FallStep, stage: TileStage): Promise<void> {
        const onLand = landingThud(stage);
        await Promise.all(
            step.moves.map((move) => {
                const node = stage.nodeOf(move.tileId);
                stage.sortByRow(node, move.to.row);
                const target = stage.layout.cellCenter(move.to.col, move.to.row);
                return dropNode(node, target, move.from.row - move.to.row, 0, onLand);
            }),
        );
    }
}
