import { ReadonlyBoard } from '../board/Board';
import { GridPos, gridPos } from '../board/GridPos';
import { BurnArea } from './BurnArea';

export class RowArea implements BurnArea {
    cellsAround(board: ReadonlyBoard, origin: GridPos): GridPos[] {
        const cells: GridPos[] = [];
        for (let col = 0; col < board.cols; col++) {
            cells.push(gridPos(col, origin.row));
        }
        return cells;
    }
}
