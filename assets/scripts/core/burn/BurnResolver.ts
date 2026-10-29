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
    /** What fired the wave: a super tile kind or a booster id. null for a tapped color group. */
    readonly blast: string | null;
    readonly tiles: ReadonlyArray<BurnedTile>;
}

interface PendingWave {
    readonly origin: GridPos;
    readonly blast: string | null;
    readonly cells: GridPos[];
    /** A super tile that started this wave is consumed without firing again. */
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
        return this.resolve(board, this.waveOf(tile, board, at));
    }

    /** @param blast the booster that burns these cells, or null for a tapped color group. */
    burn(board: Board, origin: GridPos, cells: GridPos[], blast: string | null = null): BurnWave[] {
        return this.resolve(board, { origin, blast, cells, sourceTileId: null });
    }

    private resolve(board: Board, first: PendingWave): BurnWave[] {
        const waves: BurnWave[] = [];
        const pending: PendingWave[] = [first];

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
                    pending.push(this.waveOf(tile, board, at));
                }
            }
            waves.push({ origin: wave.origin, blast: wave.blast, tiles: burned });
        }
        return waves;
    }

    private waveOf(superTile: Tile, board: Board, at: GridPos): PendingWave {
        const kind = superTile.requireSuperKind();
        const cells = this.catalog.areaFor(kind).cellsAround(board, at);
        return { origin: at, blast: kind, cells, sourceTileId: superTile.id };
    }
}
