import { ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { SuperKind } from '../tiles/SuperKinds';
import { SuperTilePicker } from '../tiles/SuperTilePicker';
import { GroupRules } from './GroupRules';

/** A group that earns a super tile when tapped, and every kind it may turn into. */
export interface RewardGroup {
    readonly cells: ReadonlyArray<GridPos>;
    readonly kinds: ReadonlyArray<SuperKind>;
}

/** The groups on the board that would earn a super tile right now, so the player can plan around them. */
export class SuperTileRewards {
    constructor(
        private readonly rules: GroupRules,
        private readonly superTiles: SuperTilePicker,
    ) {}

    find(board: ReadonlyBoard): RewardGroup[] {
        const rewards: RewardGroup[] = [];
        this.rules.burnableGroups(board).forEach((cells) => {
            const kinds = this.superTiles.kindsFor(cells.length);
            if (kinds.length > 0) {
                rewards.push({ cells, kinds });
            }
        });
        return rewards;
    }
}
