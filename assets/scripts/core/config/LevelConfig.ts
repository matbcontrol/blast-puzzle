import { SuperTileRule } from '../tiles/SuperTilePicker';

export interface LevelConfig {
    readonly cols: number;
    readonly rows: number;
    readonly colors: number;
    readonly minGroupSize: number;
    readonly targetScore: number;
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
