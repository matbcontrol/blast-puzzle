import { PlayerAction } from '../actions/PlayerAction';
import { SwapAction } from '../actions/SwapAction';
import { ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { Booster } from './Booster';

export class TeleportBooster implements Booster {
    readonly id = 'teleport';
    readonly targetCount = 2;

    createAction(targets: ReadonlyArray<GridPos>): PlayerAction {
        return new SwapAction(targets[0], targets[1]);
    }

    previewCells(board: ReadonlyBoard, target: GridPos): GridPos[] {
        return board.tileAt(target) !== null ? [target] : [];
    }
}
