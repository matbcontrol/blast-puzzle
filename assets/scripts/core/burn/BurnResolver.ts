import { Board } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { Tile } from '../tiles/Tile';
import { SuperTileCatalog } from './SuperTileCatalog';

export interface BurnedTile {
    readonly tile: Tile;
    readonly at: GridPos;
}

export interface BurnWave {
    readonly origin: GridPos;
    readonly tiles: ReadonlyArray<BurnedTile>;
}

interface PendingWave {
    readonly origin: GridPos;
    readonly cells: GridPos[];
    readonly sourceTileId: number | null;
}

/**
 * Clears cells from the board. Every super tile caught in the blast fires its own area as the next wave.
 * Each tile is removed the moment it burns, so a chain always terminates.
 */
export class BurnResolver {
    constructor(private readonly catalog: SuperTileCatalog) {}

    /** Fires the super tile at `at` with its own area. The tile burns in the first wave and does not fire again. */
    detonate(board: Board, at: GridPos): BurnWave[] {
        const tile = board.tileAt(at);
        if (tile === null || !tile.isSuper) {
            throw new Error(`No super tile at ${at.col}:${at.row}`);
        }
        return this.burn(board, at, this.blastOf(tile, board, at), tile.id);
    }

    /** @param sourceTileId super tile that started the burn: it is consumed without firing again. */
    burn(board: Board, origin: GridPos, cells: GridPos[], sourceTileId: number | null = null): BurnWave[] {
        const waves: BurnWave[] = [];
        const pending: PendingWave[] = [{ origin, cells, sourceTileId }];

        while (pending.length > 0) {
            const wave = pending.shift() as PendingWave;
            const burned: BurnedTile[] = [];
            for (const at of wave.cells) {
                const tile = board.tileAt(at);
                if (tile === null) {
                    continue;
                }
                board.put(at, null);
                burned.push({ tile, at });
                if (tile.isSuper && tile.id !== wave.sourceTileId) {
                    pending.push({ origin: at, cells: this.blastOf(tile, board, at), sourceTileId: tile.id });
                }
            }
            waves.push({ origin: wave.origin, tiles: burned });
        }
        return waves;
    }

    private blastOf(superTile: Tile, board: Board, at: GridPos): GridPos[] {
        return this.catalog.areaFor(superTile.requireSuperKind()).cellsAround(board, at);
    }
}
