import { Board, ReadonlyBoard } from '../board/Board';
import { GridPos } from '../board/GridPos';
import { BurnResolver } from '../burn/BurnResolver';
import { ActionStep } from '../game/TurnStep';
import { SuperKind } from '../tiles/SuperKinds';
import { Tile } from '../tiles/Tile';
import { TileFactory } from '../tiles/TileFactory';
import { PlayerAction } from './PlayerAction';

/** Turns the regular tile at `at` into a super tile and fires it at once. */
export class BonusSuperAction implements PlayerAction {
    constructor(
        private readonly at: GridPos,
        private readonly kind: SuperKind,
        private readonly tiles: TileFactory,
        private readonly burner: BurnResolver,
    ) {}

    canApply(board: ReadonlyBoard): boolean {
        const tile = board.tileAt(this.at);
        return tile !== null && !tile.isSuper;
    }

    previewCells(board: ReadonlyBoard): GridPos[] {
        return this.canApply(board) ? this.burner.reach(board, this.at, this.kind) : [];
    }

    apply(board: Board): ActionStep[] {
        if (!this.canApply(board)) {
            throw new Error(`No regular tile at ${this.at.col}:${this.at.row} to turn into a super tile`);
        }
        const replaced = board.tileAt(this.at) as Tile;
        const tile = this.tiles.createSuper(this.kind);
        board.put(this.at, tile);
        return [
            { type: 'bonusSuper', replaced, tile, at: this.at },
            { type: 'burn', cause: 'blast', waves: this.burner.detonate(board, this.at) },
        ];
    }
}
