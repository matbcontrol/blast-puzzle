import { ReadonlyBoard } from '../board/Board';
import { findColorGroup } from '../board/ColorGroup';
import { GridPos, posKey } from '../board/GridPos';

/** Decides what counts as a burnable group, which taps are legal and whether the player has any move left. */
export class GroupRules {
    constructor(readonly minGroupSize: number) {}

    burnableGroupAt(board: ReadonlyBoard, origin: GridPos): GridPos[] | null {
        const group = findColorGroup(board, origin);
        return this.isBurnable(group) ? group : null;
    }

    /** The one definition of a legal tap: a super tile fires, a regular tile needs a burnable group. */
    canTap(board: ReadonlyBoard, at: GridPos): boolean {
        const tile = board.tileAt(at);
        return tile !== null && (tile.isSuper || this.burnableGroupAt(board, at) !== null);
    }

    /** Same answer as canTap on every cell, but floods each group only once. */
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
            if (this.isBurnable(group)) {
                return true;
            }
            group.forEach((member) => checked.add(posKey(member)));
        }
        return false;
    }

    private isBurnable(group: GridPos[]): boolean {
        return group.length >= this.minGroupSize;
    }
}
