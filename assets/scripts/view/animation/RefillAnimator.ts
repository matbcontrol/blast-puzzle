import { RefillStep } from '../../core/game/TurnStep';
import { dropNode, landingThud } from './DropMotion';
import { StepAnimator } from './StepAnimator';
import { TurnStage } from './TileStage';
import { Timings } from './Timings';

/**
 * New tiles wait above the board, outside the mask, and rain into each column once its burn is over, the lowest
 * first. A column's fall starts at the same moment and no later, so a new tile never catches up with an old one.
 */
export class RefillAnimator implements StepAnimator<'refill'> {
    readonly type = 'refill';

    async play(step: RefillStep, stage: TurnStage): Promise<void> {
        const rows = stage.layout.rows;
        const firstCol = step.tiles.reduce((min, spawned) => Math.min(min, spawned.at.col), Infinity);
        const onLand = landingThud(stage);
        await Promise.all(
            step.tiles.map(async (spawned) => {
                await stage.columnSettled(spawned.at.col);
                const node = stage.spawn(spawned.tile, spawned.at.col, spawned.startRow);
                stage.sortByRow(node, spawned.at.row);
                const target = stage.layout.cellCenter(spawned.at.col, spawned.at.row);
                const delay =
                    (spawned.at.col - firstCol) * Timings.refillColumnStagger +
                    (spawned.startRow - rows) * Timings.refillRowStagger;
                await dropNode(node, target, spawned.startRow - spawned.at.row, delay, onLand);
            }),
        );
    }
}
