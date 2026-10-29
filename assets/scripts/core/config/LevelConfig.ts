import { StarScores } from '../rules/LevelProgress';
import { SuperTileRule } from '../tiles/SuperTilePicker';

export interface LevelConfig {
    readonly cols: number;
    readonly rows: number;
    readonly colorCount: number;
    readonly minGroupSize: number;
    readonly targetScore: number;
    readonly starScores: StarScores;
    readonly moves: number;
    readonly pointsPerTile: number;
    readonly maxShuffles: number;
    readonly bombCharges: number;
    readonly bombRadius: number;
    readonly teleportCharges: number;
    readonly superBombRadius: number;
    readonly superTiles: ReadonlyArray<SuperTileRule>;
    /** null picks a random seed on every start. */
    readonly seed: number | null;
}
