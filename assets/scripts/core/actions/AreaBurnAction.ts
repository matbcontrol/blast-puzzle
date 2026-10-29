import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnArea } from '../burn/BurnArea';
import { BurnResolver } from '../burn/BurnResolver';
import { ActionStep } from '../game/TurnStep';
import { PlayerAction } from './PlayerAction';

export class AreaBurnAction implements PlayerAction {
    constructor(
        private readonly origin: GridPos,
        private readonly area: BurnArea,
        private readonly burner: BurnResolver,
        private readonly blast: string,
    ) {}

    canApply(board: ReadonlyBoard): boolean {
        return board.contains(this.origin);
    }

    apply(board: Board): ActionStep[] {
        if (!this.canApply(board)) {
            throw new Error(`Cell ${this.origin.col}:${this.origin.row} is outside the board`);
        }
        const waves = this.burner.burn(board, this.origin, this.area.cellsAround(board, this.origin), this.blast);
        return [{ type: 'burn', waves, fromGroup: false, collapseTo: null }];
    }
}
