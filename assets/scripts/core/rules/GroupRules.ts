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

    /** Every burnable group on the board, each flooded and listed once. */
    burnableGroups(board: ReadonlyBoard): GridPos[][] {
        const seen = new Set<string>();
        const groups: GridPos[][] = [];
        for (const p of board.positions()) {
            if (seen.has(posKey(p))) {
                continue;
            }
            const group = findColorGroup(board, p);
            group.forEach((member) => seen.add(posKey(member)));
            if (this.isBurnable(group)) {
                groups.push(group);
            }
        }
        return groups;
    }

    /** The one definition of a legal tap: a super tile fires, a regular tile needs a burnable group. */
    canTap(board: ReadonlyBoard, at: GridPos): boolean {
        const tile = board.tileAt(at);
        return tile !== null && (tile.isSuper || this.burnableGroupAt(board, at) !== null);
    }

    /** Same answer as canTap on every cell, but floods each group only once. */
    hasMove(board: ReadonlyBoard): boolean {
        return board.cellsWhere((tile) => tile.isSuper).length > 0 || this.burnableGroups(board).length > 0;
    }

    private isBurnable(group: GridPos[]): boolean {
        return group.length >= this.minGroupSize;
    }
}
