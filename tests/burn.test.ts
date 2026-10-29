import { gridPos, posKey } from '../assets/scripts/core/board/GridPos';
import { BurnResolver } from '../assets/scripts/core/burn/BurnResolver';
import { ColumnArea } from '../assets/scripts/core/burn/ColumnArea';
import { RadiusArea } from '../assets/scripts/core/burn/RadiusArea';
import { RowArea } from '../assets/scripts/core/burn/RowArea';
import { SuperTileCatalog } from '../assets/scripts/core/burn/SuperTileCatalog';
import { WholeBoardArea } from '../assets/scripts/core/burn/WholeBoardArea';
import { boardFromText, boardToText } from './helpers/boardText';

const catalog = () =>
    new SuperTileCatalog()
        .register('row', new RowArea())
        .register('column', new ColumnArea())
        .register('bomb', new RadiusArea(1))
        .register('field', new WholeBoardArea());

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

describe('SuperTileCatalog', () => {
    it('refuses unknown and duplicate kinds', () => {
        expect(() => catalog().areaFor('rainbow')).toThrow('Unknown super tile');
        expect(() => catalog().register('row', new RowArea())).toThrow('already registered');
    });
});

describe('BurnResolver', () => {
    it('removes the cells and reports one wave', () => {
        const board = boardFromText(['RRG', 'BBB']);

        const waves = new BurnResolver(catalog()).burn(board, gridPos(0, 1), [gridPos(0, 1), gridPos(1, 1)]);

        expect(boardToText(board)).toEqual(['..G', 'BBB']);
        expect(waves).toHaveLength(1);
        expect(waves[0].tiles).toHaveLength(2);
    });

    it('chains into super tiles caught in the blast', () => {
        const board = boardFromText([
            'RRRR', //
            'G-GG',
            'BBBB',
        ]);

        const waves = new BurnResolver(catalog()).burn(board, gridPos(0, 2), [
            gridPos(0, 2),
            gridPos(1, 2),
            gridPos(1, 1),
        ]);

        expect(boardToText(board)).toEqual(['..RR', '....', 'BBBB']);
        expect(waves.map((w) => posKey(w.origin))).toEqual(['0:2', '1:1']);
    });

    it('does not fire the source tile twice and stops when supers hit each other', () => {
        const board = boardFromText(['-|', 'RG']);
        const row = board.tileAt(gridPos(0, 1))!;

        const waves = new BurnResolver(catalog()).burn(
            board,
            gridPos(0, 1),
            new RowArea().cellsAround(board, gridPos(0, 1)),
            row.id,
        );

        expect(waves.map((w) => posKey(w.origin))).toEqual(['0:1', '1:1']);
        expect(boardToText(board)).toEqual(['..', 'R.']);
    });
});

describe('BurnResolver.detonate', () => {
    it('fires the area registered for the kind of the super tile', () => {
        const board = boardFromText([
            'RGBY', //
            'G|YB',
            'BYRG',
        ]);

        const waves = new BurnResolver(catalog()).detonate(board, gridPos(1, 1));

        expect(boardToText(board)).toEqual(['R.BY', 'G.YB', 'B.RG']);
        expect(waves).toHaveLength(1);
        expect(posKey(waves[0].origin)).toBe('1:1');
    });

    it('burns the source tile once without firing it again', () => {
        const board = boardFromText(['RGB', 'G*R', 'BRG']);
        const bomb = board.tileAt(gridPos(1, 1))!;

        const waves = new BurnResolver(catalog()).detonate(board, gridPos(1, 1));

        expect(waves).toHaveLength(1);
        expect(waves[0].tiles.filter((burned) => burned.tile.id === bomb.id)).toHaveLength(1);
        expect(boardToText(board)).toEqual(['...', '...', '...']);
    });

    it('refuses a cell without a super tile', () => {
        const board = boardFromText(['R.']);
        expect(() => new BurnResolver(catalog()).detonate(board, gridPos(0, 0))).toThrow('No super tile');
        expect(() => new BurnResolver(catalog()).detonate(board, gridPos(1, 0))).toThrow('No super tile');
    });
});
