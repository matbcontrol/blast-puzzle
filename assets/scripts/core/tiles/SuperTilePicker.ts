import { Random, randomItem } from '../random/Random';
import { SuperKind } from './SuperKinds';

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

    /**
     * Every kind a group of this size may turn into, empty when it earns none. Draws no random number,
     * so a hint or a badge never changes the game that follows.
     */
    kindsFor(groupSize: number): ReadonlyArray<SuperKind> {
        const rule = this.rules.find((candidate) => groupSize >= candidate.minGroupSize);
        return rule === undefined ? [] : rule.kinds;
    }

    earnsSuper(groupSize: number): boolean {
        return this.kindsFor(groupSize).length > 0;
    }

    pick(groupSize: number): SuperKind | null {
        const kinds = this.kindsFor(groupSize);
        return kinds.length > 0 ? randomItem(this.random, kinds) : null;
    }
}
