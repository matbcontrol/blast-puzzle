import { Tile } from '../tiles/Tile';
import { GridPos, gridPos } from './GridPos';

export interface ReadonlyBoard {
    readonly cols: number;
    readonly rows: number;
    contains(p: GridPos): boolean;
    tileAt(p: GridPos): Tile | null;
    positions(): GridPos[];
}

export class Board implements ReadonlyBoard {
    private readonly cells: Array<Tile | null>;

    constructor(
        readonly cols: number,
        readonly rows: number,
    ) {
        if (cols <= 0 || rows <= 0) {
            throw new Error(`Board size must be positive, got ${cols}x${rows}`);
        }
        this.cells = new Array<Tile | null>(cols * rows).fill(null);
    }

    contains(p: GridPos): boolean {
        return p.col >= 0 && p.col < this.cols && p.row >= 0 && p.row < this.rows;
    }

    tileAt(p: GridPos): Tile | null {
        return this.contains(p) ? this.cells[this.indexOf(p)] : null;
    }

    put(p: GridPos, tile: Tile | null): void {
        this.cells[this.indexOf(p)] = tile;
    }

    swap(a: GridPos, b: GridPos): void {
        const tile = this.tileAt(a);
        this.put(a, this.tileAt(b));
        this.put(b, tile);
    }

    positions(): GridPos[] {
        const result: GridPos[] = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                result.push(gridPos(col, row));
            }
        }
        return result;
    }

    private indexOf(p: GridPos): number {
        if (!this.contains(p)) {
            throw new Error(`Cell ${p.col}:${p.row} is outside the board`);
        }
        return p.row * this.cols + p.col;
    }
}
