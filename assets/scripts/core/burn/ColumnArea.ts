import { ReadonlyBoard } from '../board/Board';
import { GridPos, gridPos } from '../board/GridPos';
import { BurnArea } from './BurnArea';

export class ColumnArea implements BurnArea {
    cellsAround(board: ReadonlyBoard, origin: GridPos): GridPos[] {
        const cells: GridPos[] = [];
        for (let row = 0; row < board.rows; row++) {
            cells.push(gridPos(origin.col, row));
        }
        return cells;
    }
}
