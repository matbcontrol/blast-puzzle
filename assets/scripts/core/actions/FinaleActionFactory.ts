import { ReadonlyBoard } from '../board/Board';
import { BurnResolver } from '../burn/BurnResolver';
import { Random, randomItem } from '../random/Random';
import { SuperKind } from '../tiles/SuperKinds';
import { TileFactory } from '../tiles/TileFactory';
import { ActivateSuperAction } from './ActivateSuperAction';
import { BonusSuperAction } from './BonusSuperAction';
import { PlayerAction } from './PlayerAction';

/** One turn of the bonus round, and whether it costs one of the moves left. */
export interface FinaleMove {
    readonly action: PlayerAction;
    readonly spendsMove: boolean;
}

/**
 * The bonus round after a win, as in Toon Blast: super tiles the player saved go off first and cost nothing,
 * then each move left turns a random regular tile into a super tile that fires at once.
 */
export class FinaleActionFactory {
    constructor(
        private readonly random: Random,
        private readonly kinds: ReadonlyArray<SuperKind>,
        private readonly tiles: TileFactory,
        private readonly burner: BurnResolver,
    ) {}

    /** Null once the round is over: no super tile is left and no move, or no regular tile is left to turn. */
    next(board: ReadonlyBoard, movesLeft: number): FinaleMove | null {
        const saved = board.cellsWhere((tile) => tile.isSuper)[0];
        if (saved !== undefined) {
            return { action: new ActivateSuperAction(saved, this.burner), spendsMove: false };
        }
        const regular = board.cellsWhere((tile) => !tile.isSuper);
        if (movesLeft <= 0 || regular.length === 0) {
            return null;
        }
        const at = randomItem(this.random, regular);
        return {
            action: new BonusSuperAction(at, randomItem(this.random, this.kinds), this.tiles, this.burner),
            spendsMove: true,
        };
    }
}
