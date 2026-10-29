import { AreaBurnAction } from '../actions/AreaBurnAction';
import { PlayerAction } from '../actions/PlayerAction';
import { ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnArea } from '../burn/BurnArea';
import { BurnResolver } from '../burn/BurnResolver';
import { SuperKind } from '../tiles/SuperKinds';
import { Booster } from './Booster';
import { BoosterIds } from './BoosterIds';

export class BombBooster implements Booster {
    readonly id = BoosterIds.Bomb;
    readonly targetCount = 1;

    /** @param blast the kind of explosion the bomb sets off, reported on its waves like a super tile's. */
    constructor(
        private readonly area: BurnArea,
        private readonly burner: BurnResolver,
        private readonly blast: SuperKind,
    ) {}

    createAction(targets: ReadonlyArray<GridPos>): PlayerAction {
        return new AreaBurnAction(targets[0], this.area, this.burner, this.blast);
    }

    previewCells(board: ReadonlyBoard, target: GridPos): GridPos[] {
        return this.createAction([target]).previewCells(board);
    }
}
