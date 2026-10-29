import { Board } from '../assets/scripts/core/board/Board';
import { BoardFiller } from '../assets/scripts/core/board/BoardFiller';
import { findColorGroup } from '../assets/scripts/core/board/ColorGroup';
import { dropTiles } from '../assets/scripts/core/board/Gravity';
import { gridPos, posKey } from '../assets/scripts/core/board/GridPos';
import { GroupRules } from '../assets/scripts/core/rules/GroupRules';
import { TileFactory } from '../assets/scripts/core/tiles/TileFactory';
import { boardFromText, boardToText } from './helpers/boardText';
import { alwaysRed } from './helpers/fixtures';

const keys = (cells: { col: number; row: number }[]) => cells.map(posKey).sort();

describe('Board', () => {
    it('rejects access outside of the grid', () => {
        const board = new Board(3, 2);
        expect(board.tileAt(gridPos(3, 0))).toBeNull();
        expect(() => board.put(gridPos(0, 2), null)).toThrow();
    });
});

describe('findColorGroup', () => {
    const board = boardFromText([
        'RRG', //
        'GRG',
        'RGG',
    ]);

    it('collects orthogonal neighbours of the same color', () => {
        expect(keys(findColorGroup(board, gridPos(1, 2)))).toEqual(keys([gridPos(0, 2), gridPos(1, 2), gridPos(1, 1)]));
    });

    it('does not connect through diagonals', () => {
        expect(findColorGroup(board, gridPos(0, 0))).toEqual([gridPos(0, 0)]);
    });

    it('returns nothing for empty cells and super tiles', () => {
        const withSuper = boardFromText(['R*', '.R']);
        expect(findColorGroup(withSuper, gridPos(1, 1))).toEqual([]);
        expect(findColorGroup(withSuper, gridPos(0, 0))).toEqual([]);
    });
});

describe('GroupRules', () => {
    it('finds a move when two neighbours match', () => {
        expect(new GroupRules(2).hasMove(boardFromText(['RG', 'BG']))).toBe(true);
    });

    it('reports a dead board', () => {
        expect(new GroupRules(2).hasMove(boardFromText(['RG', 'GR']))).toBe(false);
    });

    it('treats any super tile as a move', () => {
        expect(new GroupRules(2).hasMove(boardFromText(['R|', 'GR']))).toBe(true);
    });

    it('respects the minimum group size', () => {
        const board = boardFromText(['RRG', 'BGB']);
        expect(new GroupRules(3).hasMove(board)).toBe(false);
        expect(new GroupRules(3).burnableGroupAt(board, gridPos(0, 1))).toBeNull();
    });
});

describe('dropTiles', () => {
    it('compacts columns towards the bottom and reports every move', () => {
        const board = boardFromText([
            'RG', //
            '.B',
            'Y.',
            '..',
        ]);
        const red = board.tileAt(gridPos(0, 3))!;

        const moves = dropTiles(board);

        expect(boardToText(board)).toEqual(['..', '..', 'RG', 'YB']);
        expect(moves).toContainEqual({ tileId: red.id, from: gridPos(0, 3), to: gridPos(0, 1) });
        expect(moves).toHaveLength(4);
    });

    it('does nothing on a full board', () => {
        expect(dropTiles(boardFromText(['RG', 'BY']))).toEqual([]);
    });
});

describe('BoardFiller', () => {
    it('fills empty cells and stacks new tiles above the board in falling order', () => {
        const board = boardFromText(['..', '.G', 'BG']);

        const spawned = new BoardFiller(new TileFactory(alwaysRed(), 5)).fillEmpty(board);

        expect(boardToText(board)).toEqual(['RR', 'RG', 'BG']);
        expect(spawned.map((s) => [posKey(s.at), s.startRow])).toEqual([
            ['0:1', 3],
            ['0:2', 4],
            ['1:2', 3],
        ]);
    });
});
