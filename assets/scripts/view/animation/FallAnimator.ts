import { FallStep } from '../../core/game/TurnStep';
import { dropNode } from './DropMotion';
import { StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

export class FallAnimator implements StepAnimator<'fall'> {
    readonly type = 'fall';

    async play(step: FallStep, stage: TileStage): Promise<void> {
        await Promise.all(
            step.moves.map((move) => {
                const node = stage.nodeOf(move.tileId);
                stage.sortByRow(node, move.to.row);
                const target = stage.layout.cellCenter(move.to.col, move.to.row);
                return dropNode(node, target, move.from.row - move.to.row, move.to.col * Timings.columnStagger);
            }),
        );
    }
}
