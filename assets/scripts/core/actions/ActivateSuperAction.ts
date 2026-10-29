import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnResolver } from '../burn/BurnResolver';
import { TurnStep } from '../game/TurnStep';
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

    apply(board: Board): TurnStep[] {
        if (!this.canApply(board)) {
            throw new Error('No super tile at the tapped cell');
        }
        const waves = this.burner.detonate(board, this.origin);
        return [{ type: 'burn', waves, fromGroup: false }];
    }
}
