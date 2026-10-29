import { SpawnedTile } from '../board/BoardFiller';
import { TileMove } from '../board/Gravity';
import { GridPos } from '../board/GridPos';
import { BurnWave } from '../burn/BurnResolver';
import { Tile } from '../tiles/Tile';

/** What happened during a turn, in order. The view replays these steps as animations. */
export type TurnStep = BurnStep | SuperCreatedStep | SwapStep | FallStep | RefillStep | ShuffleStep;

export interface BurnStep {
    readonly type: 'burn';
    readonly waves: ReadonlyArray<BurnWave>;
}

export interface SuperCreatedStep {
    readonly type: 'superCreated';
    readonly tile: Tile;
    readonly at: GridPos;
}

export interface SwapStep {
    readonly type: 'swap';
    readonly moves: ReadonlyArray<TileMove>;
}

export interface FallStep {
    readonly type: 'fall';
    readonly moves: ReadonlyArray<TileMove>;
}

export interface RefillStep {
    readonly type: 'refill';
    readonly tiles: ReadonlyArray<SpawnedTile>;
}

export interface ShuffleStep {
    readonly type: 'shuffle';
    readonly moves: ReadonlyArray<TileMove>;
}

export function countBurned(steps: ReadonlyArray<TurnStep>): number {
    let count = 0;
    for (const step of steps) {
        if (step.type === 'burn') {
            step.waves.forEach((wave) => (count += wave.tiles.length));
        }
    }
    return count;
}
