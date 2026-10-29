import { ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnArea } from './BurnArea';

export class WholeBoardArea implements BurnArea {
    cellsAround(board: ReadonlyBoard): GridPos[] {
        return board.positions();
    }
}
