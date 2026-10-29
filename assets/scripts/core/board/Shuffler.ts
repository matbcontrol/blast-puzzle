import { Random, randomInt, randomItem, shuffleInPlace } from '../random/Random';
import { GroupRules } from '../rules/GroupRules';
import { Tile, TileColor } from '../tiles/Tile';
import { Board } from './Board';
import { TileMove } from './Gravity';
import { GridPos, gridPos, posKey, samePos } from './GridPos';

/**
 * Random shuffle that always leaves the player a move.
 * If plain shuffling did not produce a group, one is planted by swapping same-colored tiles into a line.
 */
export class Shuffler {
    constructor(
        private readonly random: Random,
        private readonly rules: GroupRules,
    ) {}

    shuffle(board: Board): TileMove[] {
        const before = this.positionsById(board);

        const occupied = board.positions().filter((p) => board.tileAt(p) !== null);
        const tiles = occupied.map((p) => board.tileAt(p) as Tile);
        shuffleInPlace(this.random, tiles);
        occupied.forEach((p, i) => board.put(p, tiles[i]));

        if (!this.rules.hasMove(board)) {
            this.plantGroup(board);
        }
        return this.movesSince(before, board);
    }

    private plantGroup(board: Board): void {
        const size = this.rules.minGroupSize;
        const byColor = this.regularTilesByColor(board);
        const colors: TileColor[] = [];
        byColor.forEach((cells, color) => {
            if (cells.length >= size) {
                colors.push(color);
            }
        });
        if (colors.length === 0) {
            throw new Error(`No color has ${size} tiles, a group cannot be formed`);
        }

        const color = randomItem(this.random, colors);
        const line = this.pickLine(board, size);
        const lineKeys = new Set(line.map(posKey));
        const donors = (byColor.get(color) as GridPos[]).filter((p) => !lineKeys.has(posKey(p)));

        for (const cell of line) {
            const tile = board.tileAt(cell);
            if (tile !== null && tile.color === color) {
                continue;
            }
            board.swap(cell, donors.pop() as GridPos);
        }
    }

    private pickLine(board: Board, size: number): GridPos[] {
        const fitsRow = board.cols >= size;
        const fitsColumn = board.rows >= size;
        if (!fitsRow && !fitsColumn) {
            throw new Error(`A group of ${size} does not fit a ${board.cols}x${board.rows} board`);
        }
        const horizontal = fitsRow && (!fitsColumn || this.random.next() < 0.5);
        const col = randomInt(this.random, horizontal ? board.cols - size + 1 : board.cols);
        const row = randomInt(this.random, horizontal ? board.rows : board.rows - size + 1);

        const line: GridPos[] = [];
        for (let i = 0; i < size; i++) {
            line.push(horizontal ? gridPos(col + i, row) : gridPos(col, row + i));
        }
        return line;
    }

    private regularTilesByColor(board: Board): Map<TileColor, GridPos[]> {
        const result = new Map<TileColor, GridPos[]>();
        for (const p of board.positions()) {
            const tile = board.tileAt(p);
            if (tile === null || tile.color === null) {
                continue;
            }
            const cells = result.get(tile.color) || [];
            cells.push(p);
            result.set(tile.color, cells);
        }
        return result;
    }

    private positionsById(board: Board): Map<number, GridPos> {
        const result = new Map<number, GridPos>();
        for (const p of board.positions()) {
            const tile = board.tileAt(p);
            if (tile !== null) {
                result.set(tile.id, p);
            }
        }
        return result;
    }

    private movesSince(before: Map<number, GridPos>, board: Board): TileMove[] {
        const moves: TileMove[] = [];
        for (const to of board.positions()) {
            const tile = board.tileAt(to);
            const from = tile === null ? undefined : before.get(tile.id);
            if (tile !== null && from !== undefined && !samePos(from, to)) {
                moves.push({ tileId: tile.id, from, to });
            }
        }
        return moves;
    }
}
