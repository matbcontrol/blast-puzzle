import { gridPos } from '../assets/scripts/core/board/GridPos';
import { BoardLayout } from '../assets/scripts/view/BoardLayout';

describe('BoardLayout', () => {
    const layout = new BoardLayout(9, 10, 100, 100);

    it('puts the board center at the node origin', () => {
        expect(layout.cellCenter(0, 0)).toEqual({ x: -400, y: -450 });
        expect(layout.cellCenter(8, 9)).toEqual({ x: 400, y: 450 });
    });

    it('maps a touch point back to its cell', () => {
        expect(layout.cellAt({ x: -449, y: -499 })).toEqual(gridPos(0, 0));
        expect(layout.cellAt({ x: 10, y: 10 })).toEqual(gridPos(4, 5));
    });

    it('ignores touches outside the grid', () => {
        expect(layout.cellAt({ x: -451, y: 0 })).toBeNull();
        expect(layout.cellAt({ x: 0, y: 501 })).toBeNull();
    });
});
