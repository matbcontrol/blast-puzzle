import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { SuperKind } from '../tiles/SuperKinds';
import { Tile } from '../tiles/Tile';
import { SuperTileCatalog } from './SuperTileCatalog';

export interface BurnedTile {
    readonly tile: Tile;
    readonly at: GridPos;
}

/** Tiles that burned together, and the cell the burn spread from. */
export interface BurnWave {
    readonly origin: GridPos;
    readonly tiles: ReadonlyArray<BurnedTile>;
}

/** One explosion. A booster bomb is an explosion of the bomb kind too, only with an area of its own. */
export interface BlastWave extends BurnWave {
    readonly blast: SuperKind;
}

interface PendingBlast {
    readonly origin: GridPos;
    readonly blast: SuperKind;
    readonly cells: ReadonlyArray<GridPos>;
    /** A super tile that started this blast is consumed without firing again. */
    readonly sourceTileId: number | null;
}

/**
 * Clears cells from the board. Every super tile caught in an explosion fires its own area as the next wave.
 * Each tile is removed the moment it burns, so a chain always terminates.
 */
export class BurnResolver {
    constructor(private readonly catalog: SuperTileCatalog) {}

    /** The cells an explosion of `kind` at `at` hits by itself, before it sets off other super tiles. */
    reach(board: ReadonlyBoard, at: GridPos, kind: SuperKind): GridPos[] {
        return this.catalog.areaFor(kind).cellsAround(board, at);
    }

    /** A group holds only regular tiles, so burning it never sets anything off. */
    burnGroup(board: Board, origin: GridPos, cells: ReadonlyArray<GridPos>): BurnWave {
        return { origin, tiles: clear(board, cells) };
    }

    /** Fires the super tile at `at`. It burns in the first wave and does not fire again. */
    detonate(board: Board, at: GridPos): BlastWave[] {
        const tile = board.tileAt(at);
        if (tile === null || !tile.isSuper) {
            throw new Error(`No super tile at ${at.col}:${at.row}`);
        }
        return this.resolve(board, this.blastOf(tile, board, at));
    }

    /** An explosion that no super tile on the board fired, such as a booster bomb. */
    explode(board: Board, origin: GridPos, cells: ReadonlyArray<GridPos>, blast: SuperKind): BlastWave[] {
        return this.resolve(board, { origin, blast, cells, sourceTileId: null });
    }

    private resolve(board: Board, first: PendingBlast): BlastWave[] {
        const waves: BlastWave[] = [];
        const pending: PendingBlast[] = [first];

        while (pending.length > 0) {
            const next = pending.shift() as PendingBlast;
            const tiles = clear(board, next.cells);
            for (const burned of tiles) {
                if (burned.tile.isSuper && burned.tile.id !== next.sourceTileId) {
                    pending.push(this.blastOf(burned.tile, board, burned.at));
                }
            }
            waves.push({ origin: next.origin, blast: next.blast, tiles });
        }
        return waves;
    }

    private blastOf(superTile: Tile, board: ReadonlyBoard, at: GridPos): PendingBlast {
        const blast = superTile.requireSuperKind();
        return { origin: at, blast, cells: this.reach(board, at, blast), sourceTileId: superTile.id };
    }
}

function clear(board: Board, cells: ReadonlyArray<GridPos>): BurnedTile[] {
    const burned: BurnedTile[] = [];
    for (const at of cells) {
        const tile = board.tileAt(at);
        if (tile !== null) {
            board.put(at, null);
            burned.push({ tile, at });
        }
    }
    return burned;
}
