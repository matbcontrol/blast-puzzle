import { ReadonlyBoard } from '../board/Board';
import { BurnResolver } from '../burn/BurnResolver';
import { Random, randomItem } from '../random/Random';
import { SuperKind } from '../tiles/SuperKinds';
import { TileFactory } from '../tiles/TileFactory';
import { BonusSuperAction } from './BonusSuperAction';
import { PlayerAction } from './PlayerAction';

/** The finale after a win, as in Toon Blast: each move left turns a random regular tile into a super tile. */
export class FinaleActionFactory {
    constructor(
        private readonly random: Random,
        private readonly kinds: ReadonlyArray<SuperKind>,
        private readonly tiles: TileFactory,
        private readonly burner: BurnResolver,
    ) {}

    /** Null when no regular tile is left to turn. */
    create(board: ReadonlyBoard): PlayerAction | null {
        const regular = board.cellsWhere((tile) => !tile.isSuper);
        if (regular.length === 0) {
            return null;
        }
        const at = randomItem(this.random, regular);
        return new BonusSuperAction(at, randomItem(this.random, this.kinds), this.tiles, this.burner);
    }
}
