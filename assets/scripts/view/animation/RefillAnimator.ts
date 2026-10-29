import { RefillStep } from '../../core/game/TurnStep';
import { dropNode, landingThud } from './DropMotion';
import { StepAnimator } from './StepAnimator';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/**
 * New tiles wait above the board, outside the mask, and rain in column by column, the lowest first.
 * None starts before the tiles already falling below it, so none catches up with them.
 */
export class RefillAnimator implements StepAnimator<'refill'> {
    readonly type = 'refill';

    async play(step: RefillStep, stage: TileStage): Promise<void> {
        const rows = stage.layout.rows;
        const firstCol = step.tiles.reduce((min, spawned) => Math.min(min, spawned.at.col), Infinity);
        const onLand = landingThud(stage);
        await Promise.all(
            step.tiles.map((spawned) => {
                const node = stage.spawn(spawned.tile, spawned.at.col, spawned.startRow);
                stage.sortByRow(node, spawned.at.row);
                const target = stage.layout.cellCenter(spawned.at.col, spawned.at.row);
                const delay =
                    (spawned.at.col - firstCol) * Timings.refillColumnStagger +
                    (spawned.startRow - rows) * Timings.refillRowStagger;
                return dropNode(node, target, spawned.startRow - spawned.at.row, delay, onLand);
            }),
        );
    }
}
