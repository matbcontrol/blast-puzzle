import { CellRelease } from '../assets/scripts/app/CellRelease';
import { GridPos, gridPos } from '../assets/scripts/core/board/GridPos';
import { BoardPointer } from '../assets/scripts/view/board/BoardPointer';

const A = gridPos(1, 1);
const B = gridPos(2, 1);

function record(fingerPoints: boolean) {
    const pointer = new BoardPointer(fingerPoints);
    const released: CellRelease[] = [];
    const pointed: Array<GridPos | null> = [];
    const pressing: Array<GridPos | null> = [];
    pointer.released.add((release) => released.push(release));
    pointer.pointed.add((cell) => pointed.push(cell));
    pointer.pressing.add((cell) => pressing.push(cell));
    pointer.setAccepting(true);
    return { pointer, released, pointed, pressing };
}

describe('BoardPointer', () => {
    it('reports a release with both cells, a tap and a slide alike', () => {
        const { pointer, released } = record(false);

        pointer.down(A);
        pointer.up(A);
        pointer.down(A);
        pointer.move(B);
        pointer.up(B);

        expect(released).toEqual([
            { pressed: A, released: A },
            { pressed: A, released: B },
        ]);
    });

    it('reports nothing for a press or a release off the board', () => {
        const { pointer, released } = record(false);

        pointer.down(null);
        pointer.up(A);
        pointer.down(A);
        pointer.up(null);

        expect(released).toEqual([]);
    });

    it('shows the press only while the finger stays over the pressed cell', () => {
        const { pointer, pressing } = record(false);

        pointer.down(A);
        pointer.move(B);
        pointer.move(A);
        pointer.up(A);

        expect(pressing).toEqual([A, null, A, null]);
    });

    it('shows no press while taps are dropped, and the held one as soon as they count', () => {
        const { pointer, pressing } = record(false);
        pointer.setAccepting(false);

        pointer.down(A);
        expect(pressing).toEqual([]);
        pointer.setAccepting(true);
        pointer.setAccepting(false);

        expect(pressing).toEqual([A, null]);
    });

    it('lets a finger point on phones and only the mouse on desktop', () => {
        const phone = record(true);
        phone.pointer.down(A);
        phone.pointer.move(B);
        phone.pointer.up(B);

        const desktop = record(false);
        desktop.pointer.down(A);
        desktop.pointer.hover(B);
        desktop.pointer.up(B);
        desktop.pointer.leave();

        expect(phone.pointed).toEqual([A, B, null]);
        expect(desktop.pointed).toEqual([B, null]);
    });

    it('points at each cell once, however often the pointer moves inside it', () => {
        const { pointer, pointed } = record(false);

        pointer.hover(A);
        pointer.hover(gridPos(1, 1));
        pointer.hover(B);

        expect(pointed).toEqual([A, B]);
    });

    it('lets go of the press and the pointing when the page loses the pointer', () => {
        const { pointer, pressing, pointed, released } = record(false);

        pointer.hover(A);
        pointer.down(A);
        pointer.lost();
        pointer.up(A);

        expect(pressing).toEqual([A, null]);
        expect(pointed).toEqual([A, null]);
        expect(released).toEqual([]);
    });

    it('forgets a press made on the board before a redraw', () => {
        const { pointer, pressing, released } = record(false);

        pointer.down(A);
        pointer.reset();
        pointer.up(A);

        expect(pressing).toEqual([A, null]);
        expect(released).toEqual([]);
    });
});
