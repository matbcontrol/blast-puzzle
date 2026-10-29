import { Board } from './Board';
import { GridPos, gridPos } from './GridPos';

export interface TileMove {
    readonly tileId: number;
    readonly from: GridPos;
    readonly to: GridPos;
}

/** Compacts every column towards row 0 and reports what moved where. */
export function dropTiles(board: Board): TileMove[] {
    const moves: TileMove[] = [];
    for (let col = 0; col < board.cols; col++) {
        let freeRow = 0;
        for (let row = 0; row < board.rows; row++) {
            const from = gridPos(col, row);
            const tile = board.tileAt(from);
            if (tile === null) {
                continue;
            }
            if (row !== freeRow) {
                const to = gridPos(col, freeRow);
                board.put(to, tile);
                board.put(from, null);
                moves.push({ tileId: tile.id, from, to });
            }
            freeRow++;
        }
    }
    return moves;
}
