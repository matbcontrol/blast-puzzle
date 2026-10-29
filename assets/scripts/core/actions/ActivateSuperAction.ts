import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnResolver } from '../burn/BurnResolver';
import { SuperTileCatalog } from '../burn/SuperTileCatalog';
import { TurnStep } from '../game/TurnStep';
import { SuperKind } from '../tiles/Tile';
import { PlayerAction } from './PlayerAction';

export class ActivateSuperAction implements PlayerAction {
    constructor(
        private readonly origin: GridPos,
        private readonly burner: BurnResolver,
        private readonly catalog: SuperTileCatalog,
    ) {}

    canApply(board: ReadonlyBoard): boolean {
        const tile = board.tileAt(this.origin);
        return tile !== null && tile.isSuper;
    }

    apply(board: Board): TurnStep[] {
        const tile = board.tileAt(this.origin);
        if (tile === null || !tile.isSuper) {
            throw new Error('No super tile at the tapped cell');
        }
        const area = this.catalog.areaFor(tile.superKind as SuperKind);
        const waves = this.burner.burn(board, this.origin, area.cellsAround(board, this.origin), tile.id);
        return [{ type: 'burn', waves }];
    }
}
