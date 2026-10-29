import { Board, ReadonlyBoard } from '../../assets/scripts/core/board/Board';
import { gridPos } from '../../assets/scripts/core/board/GridPos';
import { Tile } from '../../assets/scripts/core/tiles/Tile';

/**
 * Boards in tests are drawn as text, top row first:
 *   R G B Y P  regular colors 0..4
 *   - | * #    super tiles: row, column, bomb, field
 *   .          empty cell
 */
const COLORS = 'RGBYP';
const SUPERS: { [symbol: string]: string } = { '-': 'row', '|': 'column', '*': 'bomb', '#': 'field' };

let nextId = 10_000;

export function boardFromText(lines: string[]): Board {
    const rows = lines.length;
    const cols = lines[0].length;
    const board = new Board(cols, rows);
    lines.forEach((line, lineIndex) => {
        const row = rows - 1 - lineIndex;
        line.split('').forEach((symbol, col) => board.put(gridPos(col, row), tileFor(symbol)));
    });
    return board;
}

export function boardToText(board: ReadonlyBoard): string[] {
    const lines: string[] = [];
    for (let row = board.rows - 1; row >= 0; row--) {
        let line = '';
        for (let col = 0; col < board.cols; col++) {
            line += symbolFor(board.tileAt(gridPos(col, row)));
        }
        lines.push(line);
    }
    return lines;
}

function tileFor(symbol: string): Tile | null {
    if (symbol === '.') {
        return null;
    }
    if (SUPERS[symbol] !== undefined) {
        return Tile.superTile(nextId++, SUPERS[symbol]);
    }
    const color = COLORS.indexOf(symbol);
    if (color < 0) {
        throw new Error(`Unknown board symbol "${symbol}"`);
    }
    return Tile.ofColor(nextId++, color);
}

function symbolFor(tile: Tile | null): string {
    if (tile === null) {
        return '.';
    }
    if (tile.color !== null) {
        return COLORS[tile.color];
    }
    for (const symbol of Object.keys(SUPERS)) {
        if (SUPERS[symbol] === tile.superKind) {
            return symbol;
        }
    }
    return '?';
}
