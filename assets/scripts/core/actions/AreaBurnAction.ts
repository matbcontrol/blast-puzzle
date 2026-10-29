import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnArea } from '../burn/BurnArea';
import { BurnResolver } from '../burn/BurnResolver';
import { ActionStep } from '../game/TurnStep';
import { SuperKind } from '../tiles/SuperKinds';
import { PlayerAction } from './PlayerAction';

/** An explosion of the `blast` kind over `area`, set off at a cell instead of by a super tile. */
export class AreaBurnAction implements PlayerAction {
    constructor(
        private readonly origin: GridPos,
        private readonly area: BurnArea,
        private readonly burner: BurnResolver,
        private readonly blast: SuperKind,
    ) {}

    canApply(board: ReadonlyBoard): boolean {
        return board.contains(this.origin);
    }

    previewCells(board: ReadonlyBoard): GridPos[] {
        return this.canApply(board) ? this.area.cellsAround(board, this.origin) : [];
    }

    apply(board: Board): ActionStep[] {
        if (!this.canApply(board)) {
            throw new Error(`Cell ${this.origin.col}:${this.origin.row} is outside the board`);
        }
        const cells = this.area.cellsAround(board, this.origin);
        return [{ type: 'burn', cause: 'blast', waves: this.burner.explode(board, this.origin, cells, this.blast) }];
    }
}
