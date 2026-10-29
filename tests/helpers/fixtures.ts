import { BurnResolver } from '../../assets/scripts/core/burn/BurnResolver';
import { ColumnArea } from '../../assets/scripts/core/burn/ColumnArea';
import { RadiusArea } from '../../assets/scripts/core/burn/RadiusArea';
import { RowArea } from '../../assets/scripts/core/burn/RowArea';
import { SuperTileCatalog } from '../../assets/scripts/core/burn/SuperTileCatalog';
import { WholeBoardArea } from '../../assets/scripts/core/burn/WholeBoardArea';
import { LevelConfig } from '../../assets/scripts/core/config/LevelConfig';
import { Random } from '../../assets/scripts/core/random/Random';
import { SuperKinds } from '../../assets/scripts/core/tiles/SuperKinds';

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
        starScores: [2000, 3000],
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

/** The bomb has radius 1 here, so its square fits the small boards of the tests. */
export function testResolver(): BurnResolver {
    return new BurnResolver(
        new SuperTileCatalog({
            [SuperKinds.Row]: new RowArea(),
            [SuperKinds.Column]: new ColumnArea(),
            [SuperKinds.Bomb]: new RadiusArea(1),
            [SuperKinds.Field]: new WholeBoardArea(),
        }),
    );
}
