import { LevelConfig } from '../../assets/scripts/core/config/LevelConfig';
import { Random } from '../../assets/scripts/core/random/Random';

/** Replays the given values in a loop. Lets a test decide exactly which colors fall in. */
export class ScriptedRandom implements Random {
    private index = 0;

    constructor(private readonly values: number[]) {}

    next(): number {
        const value = this.values[this.index % this.values.length];
        this.index++;
        return value;
    }
}

/** next() of 0 always picks color 0 (R), 0.2 picks color 1 (G) with 5 colors, and so on. */
export const alwaysRed = (): Random => new ScriptedRandom([0]);

export function testConfig(overrides: Partial<LevelConfig> = {}): LevelConfig {
    return {
        cols: 5,
        rows: 5,
        colorCount: 5,
        minGroupSize: 2,
        targetScore: 1000,
        moves: 10,
        pointsPerTile: 10,
        maxShuffles: 3,
        bombCharges: 2,
        bombRadius: 1,
        teleportCharges: 2,
        superBombRadius: 1,
        superTiles: [],
        seed: null,
        ...overrides,
    };
}
