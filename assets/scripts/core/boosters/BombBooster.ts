import { AreaBurnAction } from '../actions/AreaBurnAction';
import { PlayerAction } from '../actions/PlayerAction';
import { GridPos } from '../board/GridPos';
import { BurnArea } from '../burn/BurnArea';
import { BurnResolver } from '../burn/BurnResolver';
import { Booster } from './Booster';

export class BombBooster implements Booster {
    readonly id = 'bomb';
    readonly targetCount = 1;

    constructor(
        private readonly area: BurnArea,
        private readonly burner: BurnResolver,
    ) {}

    createAction(targets: ReadonlyArray<GridPos>): PlayerAction {
        return new AreaBurnAction(targets[0], this.area, this.burner);
    }
}
