import { RefillStep } from '../../core/game/TurnStep';
import { dropNode } from './DropMotion';
import { StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/** New tiles start above the board, outside the mask, and fall into place. */
export class RefillAnimator implements StepAnimator<'refill'> {
    readonly type = 'refill';

    async play(step: RefillStep, stage: TileStage): Promise<void> {
        await Promise.all(
            step.tiles.map((spawned) => {
                const node = stage.spawn(spawned.tile, spawned.at.col, spawned.startRow);
                stage.sortByRow(node, spawned.at.row);
                const target = stage.layout.cellCenter(spawned.at.col, spawned.at.row);
                return dropNode(
                    node,
                    target,
                    spawned.startRow - spawned.at.row,
                    spawned.at.col * Timings.columnStagger,
                );
            }),
        );
    }
}
