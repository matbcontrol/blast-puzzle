import { Board, ReadonlyBoard } from '../board/Board';
import { TurnStep } from '../game/TurnStep';

/** One player intent: a tap or a booster use. Changes only the board, the game settles the rest of the turn. */
export interface PlayerAction {
    canApply(board: ReadonlyBoard): boolean;
    apply(board: Board): TurnStep[];
}
