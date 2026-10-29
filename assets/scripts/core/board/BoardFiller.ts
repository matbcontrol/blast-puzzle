import { Tile } from '../tiles/Tile';
import { TileFactory } from '../tiles/TileFactory';
import { Board } from './Board';
import { GridPos, gridPos } from './GridPos';

export interface SpawnedTile {
    readonly tile: Tile;
    readonly at: GridPos;
    /** Virtual row above the board the tile falls from. Keeps spawned tiles stacked in order. */
    readonly startRow: number;
}

export class BoardFiller {
    constructor(private readonly tiles: TileFactory) {}

    fillEmpty(board: Board): SpawnedTile[] {
        const spawned: SpawnedTile[] = [];
        for (let col = 0; col < board.cols; col++) {
            let startRow = board.rows;
            for (let row = 0; row < board.rows; row++) {
                const at = gridPos(col, row);
                if (board.tileAt(at) !== null) {
                    continue;
                }
                const tile = this.tiles.createRandom();
                board.put(at, tile);
                spawned.push({ tile, at, startRow: startRow++ });
            }
        }
        return spawned;
    }
}
