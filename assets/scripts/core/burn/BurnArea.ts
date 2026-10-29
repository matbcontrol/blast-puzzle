import { ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';

/** Shape of an explosion. Every super tile and area booster is described by one of these. */
export interface BurnArea {
    cellsAround(board: ReadonlyBoard, origin: GridPos): GridPos[];
}
