/** Row 0 is the bottom row, tiles fall towards it. */
export interface GridPos {
    readonly col: number;
    readonly row: number;
}

export function gridPos(col: number, row: number): GridPos {
    return { col, row };
}

export function samePos(a: GridPos, b: GridPos): boolean {
    return a.col === b.col && a.row === b.row;
}

export function posKey(p: GridPos): string {
    return p.col + ':' + p.row;
}

export function neighbours(p: GridPos): GridPos[] {
    return [gridPos(p.col + 1, p.row), gridPos(p.col - 1, p.row), gridPos(p.col, p.row + 1), gridPos(p.col, p.row - 1)];
}
