import { gridPos, posKey } from '../assets/scripts/core/board/GridPos';
import { ColumnArea } from '../assets/scripts/core/burn/ColumnArea';
import { RadiusArea } from '../assets/scripts/core/burn/RadiusArea';
import { RowArea } from '../assets/scripts/core/burn/RowArea';
import { SuperKinds } from '../assets/scripts/core/tiles/SuperKinds';
import { boardFromText, boardToText } from './helpers/boardText';
import { testResolver } from './helpers/fixtures';

describe('burn areas', () => {
    const board = boardFromText(['RGB', 'GBR', 'BRG']);

    it('clips the radius at the board edge', () => {
        const cells = new RadiusArea(1).cellsAround(board, gridPos(0, 0)).map(posKey).sort();
        expect(cells).toEqual(['0:0', '0:1', '1:0', '1:1']);
    });

    it('covers a full row and a full column', () => {
        expect(new RowArea().cellsAround(board, gridPos(1, 2)).map(posKey)).toEqual(['0:2', '1:2', '2:2']);
        expect(new ColumnArea().cellsAround(board, gridPos(2, 0)).map(posKey)).toEqual(['2:0', '2:1', '2:2']);
    });
});

describe('BurnResolver', () => {
    it('removes a tapped group as one wave', () => {
        const board = boardFromText(['RRG', 'BBB']);

        const group = testResolver().burnGroup(board, gridPos(0, 1), [gridPos(0, 1), gridPos(1, 1)]);

        expect(boardToText(board)).toEqual(['..G', 'BBB']);
        expect(group.tiles).toHaveLength(2);
        expect(posKey(group.origin)).toBe('0:1');
    });

    it('chains an explosion into the super tiles it catches', () => {
        const board = boardFromText([
            'RRRR', //
            'G-GG',
            'BBBB',
        ]);

        const cells = [gridPos(0, 2), gridPos(1, 2), gridPos(1, 1)];

        const waves = testResolver().explode(board, gridPos(0, 2), cells, SuperKinds.Bomb);

        expect(boardToText(board)).toEqual(['..RR', '....', 'BBBB']);
        expect(waves.map((w) => posKey(w.origin))).toEqual(['0:2', '1:1']);
        expect(waves.map((w) => w.blast)).toEqual([SuperKinds.Bomb, SuperKinds.Row]);
    });

    it('tells the reach of a kind without touching the board', () => {
        const board = boardFromText(['RG', 'BY']);

        expect(testResolver().reach(board, gridPos(0, 1), SuperKinds.Row).map(posKey)).toEqual(['0:1', '1:1']);
        expect(boardToText(board)).toEqual(['RG', 'BY']);
    });
});

describe('BurnResolver.detonate', () => {
    it('fires the area of the kind of the super tile', () => {
        const board = boardFromText([
            'RGBY', //
            'G|YB',
            'BYRG',
        ]);

        const waves = testResolver().detonate(board, gridPos(1, 1));

        expect(boardToText(board)).toEqual(['R.BY', 'G.YB', 'B.RG']);
        expect(waves).toHaveLength(1);
        expect(posKey(waves[0].origin)).toBe('1:1');
        expect(waves[0].blast).toBe(SuperKinds.Column);
    });

    it('does not fire the source tile twice and stops when supers hit each other', () => {
        const board = boardFromText(['-|', 'RG']);

        const waves = testResolver().detonate(board, gridPos(0, 1));

        expect(waves.map((w) => posKey(w.origin))).toEqual(['0:1', '1:1']);
        expect(waves.map((w) => w.blast)).toEqual([SuperKinds.Row, SuperKinds.Column]);
        expect(boardToText(board)).toEqual(['..', 'R.']);
    });

    it('burns the source tile once without firing it again', () => {
        const board = boardFromText(['RGB', 'G*R', 'BRG']);
        const bomb = board.tileAt(gridPos(1, 1))!;

        const waves = testResolver().detonate(board, gridPos(1, 1));

        expect(waves).toHaveLength(1);
        expect(waves[0].tiles.filter((burned) => burned.tile.id === bomb.id)).toHaveLength(1);
        expect(boardToText(board)).toEqual(['...', '...', '...']);
    });

    it('refuses a cell without a super tile', () => {
        const board = boardFromText(['R.']);
        expect(() => testResolver().detonate(board, gridPos(0, 0))).toThrow('No super tile');
        expect(() => testResolver().detonate(board, gridPos(1, 0))).toThrow('No super tile');
    });
});
