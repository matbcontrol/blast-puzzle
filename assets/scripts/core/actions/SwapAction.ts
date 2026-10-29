import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos, samePos } from '../board/GridPos';
import { ActionStep } from '../game/TurnStep';
import { Tile } from '../tiles/Tile';
import { PlayerAction } from './PlayerAction';

export class SwapAction implements PlayerAction {
    constructor(
        private readonly a: GridPos,
        private readonly b: GridPos,
    ) {}

    /** Swapping two tiles that look the same would spend a charge without changing anything. */
    canApply(board: ReadonlyBoard): boolean {
        const first = board.tileAt(this.a);
        const second = board.tileAt(this.b);
        return !samePos(this.a, this.b) && first !== null && second !== null && !first.looksLike(second);
    }

    apply(board: Board): ActionStep[] {
        if (!this.canApply(board)) {
            throw new Error('Nothing to swap between the chosen cells');
        }
        const first = board.tileAt(this.a) as Tile;
        const second = board.tileAt(this.b) as Tile;
        board.swap(this.a, this.b);
        return [
            {
                type: 'swap',
                moves: [
                    { tileId: first.id, from: this.a, to: this.b },
                    { tileId: second.id, from: this.b, to: this.a },
                ],
            },
        ];
    }
}
