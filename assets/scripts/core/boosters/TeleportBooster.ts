import { PlayerAction } from '../actions/PlayerAction';
import { SwapAction } from '../actions/SwapAction';
import { GridPos } from '../board/GridPos';
import { Booster } from './Booster';

export class TeleportBooster implements Booster {
    readonly id = 'teleport';
    readonly targetCount = 2;

    createAction(targets: ReadonlyArray<GridPos>): PlayerAction {
        return new SwapAction(targets[0], targets[1]);
    }
}
