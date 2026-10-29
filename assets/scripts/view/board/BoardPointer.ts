import { CellRelease } from '../../app/CellRelease';
import { Signal } from '../../app/Signal';
import { GridPos, samePos } from '../../core/board/GridPos';

/**
 * What the finger and the mouse do on the board, in cells. Engine-free: PointerEvents feeds it from the node.
 * It reports releases as they are and leaves whether one was a tap to the input state.
 */
export class BoardPointer {
    /** Every release over a cell after a press on the board. */
    readonly released = new Signal<CellRelease>();
    /** The cell under the mouse, or under a finger that is down. */
    readonly pointed = new Signal<GridPos | null>();
    /** The cell that should look pressed: the pressed one, while the finger is still over it and taps count. */
    readonly pressing = new Signal<GridPos | null>();

    private pressedCell: GridPos | null = null;
    private fingerCell: GridPos | null = null;
    private pointedCell: GridPos | null = null;
    private shownPress: GridPos | null = null;
    private accepting = false;

    /** On phones the engine sends no mouse events, so there the finger is the only pointer. */
    constructor(private readonly fingerPoints: boolean) {}

    /** Off while taps are dropped, so a pressed tile never looks accepted for nothing. */
    setAccepting(accepting: boolean): void {
        this.accepting = accepting;
        this.showPress();
    }

    down(cell: GridPos | null): void {
        this.pressedCell = cell;
        this.fingerOver(cell);
    }

    move(cell: GridPos | null): void {
        if (!sameCell(cell, this.fingerCell)) {
            this.fingerOver(cell);
        }
    }

    up(cell: GridPos | null): void {
        const pressed = this.pressedCell;
        this.liftFinger();
        if (pressed !== null && cell !== null) {
            this.released.dispatch({ pressed, released: cell });
        }
    }

    cancel(): void {
        this.liftFinger();
    }

    hover(cell: GridPos | null): void {
        this.point(cell);
    }

    leave(): void {
        this.point(null);
    }

    /** The page lost the pointer: the cursor left the window, or the window lost focus with a button held. */
    lost(): void {
        this.liftFinger();
        this.point(null);
    }

    /** A new board: a press made on the old one does not carry over. */
    reset(): void {
        this.pressedCell = null;
        this.fingerCell = null;
        this.showPress();
    }

    clear(): void {
        this.released.clear();
        this.pointed.clear();
        this.pressing.clear();
    }

    private liftFinger(): void {
        this.pressedCell = null;
        this.fingerOver(null);
    }

    private fingerOver(cell: GridPos | null): void {
        this.fingerCell = cell;
        this.showPress();
        if (this.fingerPoints) {
            this.point(cell);
        }
    }

    private showPress(): void {
        const pressed = this.pressedCell;
        const shown = this.accepting && pressed !== null && sameCell(this.fingerCell, pressed) ? pressed : null;
        if (!sameCell(shown, this.shownPress)) {
            this.shownPress = shown;
            this.pressing.dispatch(shown);
        }
    }

    private point(cell: GridPos | null): void {
        if (!sameCell(cell, this.pointedCell)) {
            this.pointedCell = cell;
            this.pointed.dispatch(cell);
        }
    }
}

function sameCell(a: GridPos | null, b: GridPos | null): boolean {
    return a === null || b === null ? a === b : samePos(a, b);
}
