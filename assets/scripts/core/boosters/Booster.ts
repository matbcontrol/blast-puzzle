import { GridPos } from '../board/GridPos';
import { PlayerAction } from '../actions/PlayerAction';

/**
 * A booster asks the player for `targetCount` cells and turns them into an action.
 * The input layer only needs targetCount, so a new booster needs no new input code.
 */
export interface Booster {
    readonly id: string;
    readonly targetCount: number;
    createAction(targets: ReadonlyArray<GridPos>): PlayerAction;
}
