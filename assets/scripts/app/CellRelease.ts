import { GridPos, samePos } from '../core/board/GridPos';

/** A finger or the mouse button came up over `released` after going down over `pressed`. */
export interface CellRelease {
    readonly pressed: GridPos;
    readonly released: GridPos;
}

/** A slide across the board is not a tap: the release has to land on the pressed cell. */
export function isTap(release: CellRelease): boolean {
    return samePos(release.pressed, release.released);
}
