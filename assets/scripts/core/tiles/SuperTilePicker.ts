import { Random, randomItem } from '../random/Random';
import { SuperKind } from './Tile';

export interface SuperTileRule {
    readonly minGroupSize: number;
    readonly kinds: ReadonlyArray<SuperKind>;
}

/** Bigger groups earn stronger super tiles. The strongest matching rule wins. */
export class SuperTilePicker {
    private readonly rules: SuperTileRule[];

    constructor(
        rules: ReadonlyArray<SuperTileRule>,
        private readonly random: Random,
    ) {
        this.rules = rules.slice().sort((a, b) => b.minGroupSize - a.minGroupSize);
    }

    pick(groupSize: number): SuperKind | null {
        for (const rule of this.rules) {
            if (groupSize >= rule.minGroupSize) {
                return randomItem(this.random, rule.kinds);
            }
        }
        return null;
    }
}
