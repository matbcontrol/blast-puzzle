import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { ActionStep } from '../game/TurnStep';

/**
 * One player intent: a tap or a booster use. Changes only the board, the game settles the rest of the turn.
 * The game calls apply() only after canApply() returned true; implementations throw when it would be false,
 * so a caller that skips the check fails loudly instead of spending a move or a charge on nothing.
 */
export interface PlayerAction {
    canApply(board: ReadonlyBoard): boolean;
    /** The cells the action hits first, chain reactions left out. Empty exactly when canApply() is false. */
    previewCells(board: ReadonlyBoard): GridPos[];
    apply(board: Board): ActionStep[];
}
