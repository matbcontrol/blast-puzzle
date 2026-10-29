import { ReadonlyBoard } from '../board/Board';
import { GridPos, gridPos } from '../board/GridPos';
import { BurnArea } from './BurnArea';

/** Square of (2R+1)x(2R+1) cells, like bombs in most Blast games. R = 1 burns the 3x3 block. */
export class RadiusArea implements BurnArea {
    constructor(private readonly radius: number) {}

    cellsAround(board: ReadonlyBoard, origin: GridPos): GridPos[] {
        const cells: GridPos[] = [];
        for (let dy = -this.radius; dy <= this.radius; dy++) {
            for (let dx = -this.radius; dx <= this.radius; dx++) {
                const p = gridPos(origin.col + dx, origin.row + dy);
                if (board.contains(p)) {
                    cells.push(p);
                }
            }
        }
        return cells;
    }
}
