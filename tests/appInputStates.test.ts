import { CellRelease } from '../assets/scripts/app/CellRelease';
import { BoosterAimingInput } from '../assets/scripts/app/input/BoosterAimingInput';
import { IdleInput } from '../assets/scripts/app/input/IdleInput';
import { InputCommands, InputCues, InputQueries } from '../assets/scripts/app/input/InputState';
import { IntroInput } from '../assets/scripts/app/input/IntroInput';
import { TapBuffer } from '../assets/scripts/app/input/TapBuffer';
import { TurnLockedInput } from '../assets/scripts/app/input/TurnLockedInput';
import { gridPos, GridPos } from '../assets/scripts/core/board/GridPos';

const A = gridPos(0, 0);
const B = gridPos(1, 0);
const C = gridPos(2, 0);

const tapAt = (cell: GridPos): CellRelease => ({ pressed: cell, released: cell });
const slide = (from: GridPos, to: GridPos): CellRelease => ({ pressed: from, released: to });

/** Plays every role a state may lean on and writes down what it was asked. */
class FakeContext implements InputCommands, InputQueries, InputCues {
    readonly taps: GridPos[] = [];
    readonly fired: Array<ReadonlyArray<GridPos>> = [];
    readonly rejected: string[] = [];
    entered: string | null = null;
    selected: string | null = null;
    targets: ReadonlyArray<GridPos> = [];
    lifted: ReadonlyArray<GridPos> = [];
    glowing: ReadonlyArray<GridPos> = [];
    charges = 1;
    targetCount = 2;
    refuses = false;

    enterIdle(): void {
        this.entered = 'idle';
    }

    enterAiming(boosterId: string): void {
        this.entered = boosterId;
    }

    tap(at: GridPos): void {
        this.taps.push(at);
    }

    useBooster(_id: string, targets: ReadonlyArray<GridPos>): boolean {
        if (this.refuses) {
            return false;
        }
        this.fired.push(targets);
        return true;
    }

    boosterCharges(): number {
        return this.charges;
    }

    boosterTargetCount(): number {
        return this.targetCount;
    }

    tapPreview(at: GridPos): GridPos[] {
        return [at, B];
    }

    boosterPreview(_id: string, _picked: ReadonlyArray<GridPos>, at: GridPos): GridPos[] {
        return [at];
    }

    showTargets(cells: ReadonlyArray<GridPos>): void {
        this.targets = cells.slice();
    }

    showTapPreview(cells: ReadonlyArray<GridPos>): void {
        this.lifted = cells.slice();
    }

    showBoosterPreview(cells: ReadonlyArray<GridPos>): void {
        this.glowing = cells.slice();
    }

    selectBooster(id: string | null): void {
        this.selected = id;
    }

    rejectBooster(id: string): void {
        this.rejected.push(id);
    }
}

describe('IdleInput', () => {
    const idle = (ctx: FakeContext) => new IdleInput(ctx, ctx, ctx);

    it('plays a tap and lets a slide go', () => {
        const ctx = new FakeContext();

        idle(ctx).onCellReleased(slide(A, B));
        idle(ctx).onCellReleased(tapAt(A));

        expect(ctx.taps).toEqual([A]);
    });

    it('takes down its tap preview on exit, and only that', () => {
        const ctx = new FakeContext();
        const state = idle(ctx);
        ctx.selected = 'bomb';
        state.onCellPointed(A);
        expect(ctx.lifted).toEqual([A, B]);

        state.exit();

        expect(ctx.lifted).toEqual([]);
        expect(ctx.selected).toBe('bomb');
    });

    it('aims a booster with charges and refuses an empty one', () => {
        const ctx = new FakeContext();

        idle(ctx).onBoosterPressed('bomb');
        expect(ctx.entered).toBe('bomb');

        ctx.charges = 0;
        idle(ctx).onBoosterPressed('teleport');
        expect(ctx.rejected).toEqual(['teleport']);
    });
});

describe('BoosterAimingInput', () => {
    const aim = (ctx: FakeContext) => new BoosterAimingInput(ctx, ctx, ctx, 'teleport');

    it('picks the cell a release lands on, also after a slide', () => {
        const ctx = new FakeContext();
        const state = aim(ctx);

        state.onCellReleased(slide(A, B));
        expect(ctx.targets).toEqual([B]);

        state.onCellReleased(tapAt(C));
        expect(ctx.fired).toEqual([[B, C]]);
    });

    it('takes the last pick back when it is picked again', () => {
        const ctx = new FakeContext();
        const state = aim(ctx);

        state.onCellReleased(tapAt(A));
        state.onCellReleased(tapAt(A));

        expect(ctx.targets).toEqual([]);
        expect(ctx.fired).toEqual([]);
    });

    it('keeps the earlier picks when the game refuses the last one', () => {
        const ctx = new FakeContext();
        const state = aim(ctx);
        ctx.refuses = true;

        state.onCellReleased(tapAt(A));
        state.onCellReleased(tapAt(B));
        expect(ctx.targets).toEqual([A]);

        ctx.refuses = false;
        state.onCellReleased(tapAt(C));
        expect(ctx.fired).toEqual([[A, C]]);
    });

    it('takes down its selection, picks and preview on exit, and leaves the tap preview alone', () => {
        const ctx = new FakeContext();
        const state = aim(ctx);
        ctx.lifted = [C];
        state.enter();
        state.onCellReleased(tapAt(A));
        state.onCellPointed(B);

        state.exit();

        expect(ctx.selected).toBeNull();
        expect(ctx.targets).toEqual([]);
        expect(ctx.glowing).toEqual([]);
        expect(ctx.lifted).toEqual([C]);
    });
});

describe('IntroInput', () => {
    it('only skips the banner, on a release or a booster press', () => {
        const skip = jest.fn();
        const state = new IntroInput(skip);

        state.onCellPointed();
        expect(skip).not.toHaveBeenCalled();

        state.onCellReleased();
        state.onBoosterPressed();
        expect(skip).toHaveBeenCalledTimes(2);
        expect(state.acceptsTaps).toBe(false);
    });
});

describe('TurnLockedInput', () => {
    // The tap never expires here: expiry is the controller suite's business, on its fake clock.
    const buffer = () => new TapBuffer({ schedule: () => () => undefined }, 1);

    it('keeps the latest tap and lets slides go', () => {
        const taps = buffer();
        const state = new TurnLockedInput(taps);

        state.onCellReleased(tapAt(A));
        state.onCellReleased(tapAt(B));
        state.onCellReleased(slide(A, C));

        expect(taps.take()).toEqual(tapAt(B));
        expect(taps.take()).toBeNull();
    });

    it('drops the kept tap on a booster press', () => {
        const taps = buffer();
        const state = new TurnLockedInput(taps);
        state.onCellReleased(tapAt(A));

        state.onBoosterPressed();

        expect(taps.take()).toBeNull();
    });
});
