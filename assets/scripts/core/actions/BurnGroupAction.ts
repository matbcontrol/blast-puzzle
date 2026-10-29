import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnResolver } from '../burn/BurnResolver';
import { ActionStep } from '../game/TurnStep';
import { GroupRules } from '../rules/GroupRules';
import { SuperTilePicker } from '../tiles/SuperTilePicker';
import { TileFactory } from '../tiles/TileFactory';
import { PlayerAction } from './PlayerAction';

export class BurnGroupAction implements PlayerAction {
    constructor(
        private readonly origin: GridPos,
        private readonly rules: GroupRules,
        private readonly burner: BurnResolver,
        private readonly superTiles: SuperTilePicker,
        private readonly tiles: TileFactory,
    ) {}

    canApply(board: ReadonlyBoard): boolean {
        return this.rules.burnableGroupAt(board, this.origin) !== null;
    }

    previewCells(board: ReadonlyBoard): GridPos[] {
        return this.rules.burnableGroupAt(board, this.origin) || [];
    }

    apply(board: Board): ActionStep[] {
        const cells = this.rules.burnableGroupAt(board, this.origin);
        if (cells === null) {
            throw new Error('No burnable group at the tapped cell');
        }

        const group = this.burner.burnGroup(board, this.origin, cells);
        const kind = this.superTiles.pick(cells.length);
        if (kind === null) {
            return [{ type: 'burn', cause: 'group', group, collapseTo: null }];
        }

        const tile = this.tiles.createSuper(kind);
        board.put(this.origin, tile);
        return [
            { type: 'burn', cause: 'group', group, collapseTo: this.origin },
            { type: 'superCreated', tile, at: this.origin },
        ];
    }
}
