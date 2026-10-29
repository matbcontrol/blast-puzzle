import { GridPos, gridPos } from '../core/board/GridPos';

export interface Point {
    readonly x: number;
    readonly y: number;
}

/** Grid cells to local coordinates of a node anchored at its center, and back. Pure math, no engine. */
export class BoardLayout {
    constructor(
        readonly cols: number,
        readonly rows: number,
        readonly stepX: number,
        readonly stepY: number,
    ) {}

    get width(): number {
        return this.cols * this.stepX;
    }

    get height(): number {
        return this.rows * this.stepY;
    }

    /** Works for rows above the board too, which is where refilled tiles start. */
    cellCenter(col: number, row: number): Point {
        return {
            x: (col + 0.5) * this.stepX - this.width / 2,
            y: (row + 0.5) * this.stepY - this.height / 2,
        };
    }

    cellAt(point: Point): GridPos | null {
        const col = Math.floor((point.x + this.width / 2) / this.stepX);
        const row = Math.floor((point.y + this.height / 2) / this.stepY);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return null;
        }
        return gridPos(col, row);
    }

    distance(a: GridPos, b: GridPos): number {
        return Math.sqrt((a.col - b.col) * (a.col - b.col) + (a.row - b.row) * (a.row - b.row));
    }
}
