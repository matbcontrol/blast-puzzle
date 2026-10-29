import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos, samePos } from '../board/GridPos';
import { TurnStep } from '../game/TurnStep';
import { Tile } from '../tiles/Tile';
import { PlayerAction } from './PlayerAction';

export class SwapAction implements PlayerAction {
    constructor(
        private readonly a: GridPos,
        private readonly b: GridPos,
    ) {}

    canApply(board: ReadonlyBoard): boolean {
        return !samePos(this.a, this.b) && board.tileAt(this.a) !== null && board.tileAt(this.b) !== null;
    }

    apply(board: Board): TurnStep[] {
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
