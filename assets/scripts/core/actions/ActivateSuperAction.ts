import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnResolver } from '../burn/BurnResolver';
import { ActionStep } from '../game/TurnStep';
import { PlayerAction } from './PlayerAction';

export class ActivateSuperAction implements PlayerAction {
    constructor(
        private readonly origin: GridPos,
        private readonly burner: BurnResolver,
    ) {}

    canApply(board: ReadonlyBoard): boolean {
        const tile = board.tileAt(this.origin);
        return tile !== null && tile.isSuper;
    }

    previewCells(board: ReadonlyBoard): GridPos[] {
        const tile = board.tileAt(this.origin);
        return tile === null || tile.superKind === null ? [] : this.burner.reach(board, this.origin, tile.superKind);
    }

    apply(board: Board): ActionStep[] {
        if (!this.canApply(board)) {
            throw new Error('No super tile at the tapped cell');
        }
        return [{ type: 'burn', cause: 'blast', waves: this.burner.detonate(board, this.origin) }];
    }
}
