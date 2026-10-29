import { ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnResolver } from '../burn/BurnResolver';
import { SuperTileCatalog } from '../burn/SuperTileCatalog';
import { GroupRules } from '../rules/GroupRules';
import { SuperTilePicker } from '../tiles/SuperTilePicker';
import { TileFactory } from '../tiles/TileFactory';
import { ActivateSuperAction } from './ActivateSuperAction';
import { BurnGroupAction } from './BurnGroupAction';
import { PlayerAction } from './PlayerAction';

/** Turns a plain tap into an action: a super tile fires, a regular tile burns its group. */
export class TapActionFactory {
    constructor(
        private readonly rules: GroupRules,
        private readonly burner: BurnResolver,
        private readonly catalog: SuperTileCatalog,
        private readonly superTiles: SuperTilePicker,
        private readonly tiles: TileFactory,
    ) {}

    create(board: ReadonlyBoard, at: GridPos): PlayerAction {
        const tile = board.tileAt(at);
        if (tile !== null && tile.isSuper) {
            return new ActivateSuperAction(at, this.burner, this.catalog);
        }
        return new BurnGroupAction(at, this.rules, this.burner, this.superTiles, this.tiles);
    }
}
