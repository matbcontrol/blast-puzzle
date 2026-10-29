import { ReadonlyBoard } from '../board/Board';
import { findColorGroup } from '../board/ColorGroup';
import { GridPos, posKey } from '../board/GridPos';

/** Decides what counts as a burnable group and whether the player has any move left. */
export class GroupRules {
    constructor(readonly minGroupSize: number) {}

    burnableGroupAt(board: ReadonlyBoard, origin: GridPos): GridPos[] | null {
        const group = findColorGroup(board, origin);
        return group.length >= this.minGroupSize ? group : null;
    }

    hasMove(board: ReadonlyBoard): boolean {
        const checked = new Set<string>();
        for (const p of board.positions()) {
            if (checked.has(posKey(p))) {
                continue;
            }
            const tile = board.tileAt(p);
            if (tile === null) {
                continue;
            }
            if (tile.isSuper) {
                return true;
            }
            const group = findColorGroup(board, p);
            if (group.length >= this.minGroupSize) {
                return true;
            }
            group.forEach((member) => checked.add(posKey(member)));
        }
        return false;
    }
}
