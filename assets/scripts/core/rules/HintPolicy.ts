import { ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { SuperTilePicker } from '../tiles/SuperTilePicker';
import { GroupRules } from './GroupRules';

export interface HintPolicy {
    /** The cells to suggest to a player who hesitates. Empty when the board has no move. */
    suggest(board: ReadonlyBoard): GridPos[];
}

/**
 * Builds before it spends: a group big enough to earn a super tile comes first, then a super tile to fire,
 * then the biggest group. Pointing at the first super tile found would push the player to waste it.
 */
export class BigGroupHint implements HintPolicy {
    constructor(
        private readonly rules: GroupRules,
        private readonly superTiles: SuperTilePicker,
    ) {}

    suggest(board: ReadonlyBoard): GridPos[] {
        const biggest = this.rules
            .burnableGroups(board)
            .reduce<GridPos[]>((best, group) => (group.length > best.length ? group : best), []);
        if (biggest.length > 0 && this.superTiles.earnsSuper(biggest.length)) {
            return biggest;
        }
        const superCell = board.cellsWhere((tile) => tile.isSuper)[0];
        return superCell === undefined ? biggest : [superCell];
    }
}
