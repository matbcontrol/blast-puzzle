import { GameController } from '../assets/scripts/app/GameController';
import { BoardPresenter, BoosterPresenter, HudPresenter, ResultPresenter } from '../assets/scripts/app/GameViews';
import { Signal } from '../assets/scripts/app/Signal';
import { gridPos, GridPos } from '../assets/scripts/core/board/GridPos';
import { createBlastGame } from '../assets/scripts/core/game/BlastGameFactory';
import { TurnStep } from '../assets/scripts/core/game/TurnStep';
import { ProgressSnapshot } from '../assets/scripts/core/rules/LevelProgress';
import { boardFromText } from './helpers/boardText';
import { alwaysRed, testConfig } from './helpers/fixtures';

class FakeBoard implements BoardPresenter {
    readonly cellTapped = new Signal<GridPos>();
    readonly played: Array<ReadonlyArray<TurnStep>> = [];
    readonly rejected: GridPos[] = [];
    marked: ReadonlyArray<GridPos> = [];
    private finishAnimation: () => void = () => {};

    render(): void {}

    play(steps: ReadonlyArray<TurnStep>): Promise<void> {
        this.played.push(steps);
        return new Promise((resolve) => (this.finishAnimation = resolve));
    }

    rejectTap(at: GridPos): void {
        this.rejected.push(at);
    }

    markTargets(cells: ReadonlyArray<GridPos>): void {
        this.marked = cells.slice();
    }

    /** Lets the pending animation finish and the controller react to it. */
    async finish(): Promise<void> {
        this.finishAnimation();
        await Promise.resolve();
        await Promise.resolve();
    }
}

class FakeHud implements HudPresenter {
    last: ProgressSnapshot | null = null;
    showProgress(progress: ProgressSnapshot): void {
        this.last = progress;
    }
}

class FakeBoosters implements BoosterPresenter {
    readonly boosterPressed = new Signal<string>();
    readonly charges = new Map<string, number>();
    selected: string | null = null;
    showCharges(id: string, charges: number): void {
        this.charges.set(id, charges);
    }
    select(id: string | null): void {
        this.selected = id;
    }
}

class FakeResult implements ResultPresenter {
    readonly restartRequested = new Signal<void>();
    shown: ProgressSnapshot | null = null;
    show(progress: ProgressSnapshot): void {
        this.shown = progress;
    }
    hide(): void {
        this.shown = null;
    }
}

function setup(lines: string[], overrides = {}) {
    const views = {
        board: new FakeBoard(),
        hud: new FakeHud(),
        boosters: new FakeBoosters(),
        result: new FakeResult(),
    };
    const config = testConfig({ cols: lines[0].length, rows: lines.length, ...overrides });
    const controller = new GameController(() => createBlastGame(config, alwaysRed(), boardFromText(lines)), views);
    controller.start();
    return { views, controller };
}

const LAYOUT = ['RRB', 'GBG', 'BGB'];

describe('GameController', () => {
    it('plays a turn and shows the new progress', async () => {
        const { views } = setup(LAYOUT);

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await views.board.finish();

        expect(views.board.played).toHaveLength(1);
        expect(views.hud.last!.movesLeft).toBe(9);
    });

    it('ignores taps while a turn is animating', () => {
        const { views } = setup(LAYOUT);

        views.board.cellTapped.dispatch(gridPos(0, 2));
        views.board.cellTapped.dispatch(gridPos(0, 2));

        expect(views.board.played).toHaveLength(1);
    });

    it('gives feedback on a tap that burns nothing', () => {
        const { views } = setup(LAYOUT);

        views.board.cellTapped.dispatch(gridPos(2, 2));

        expect(views.board.rejected).toEqual([gridPos(2, 2)]);
        expect(views.board.played).toHaveLength(0);
    });

    it('aims a two-target booster, marks the first pick, then fires', async () => {
        const { views } = setup(LAYOUT);

        views.boosters.boosterPressed.dispatch('teleport');
        expect(views.boosters.selected).toBe('teleport');

        views.board.cellTapped.dispatch(gridPos(0, 0));
        expect(views.board.marked).toEqual([gridPos(0, 0)]);

        views.board.cellTapped.dispatch(gridPos(1, 0));
        expect(views.board.played).toHaveLength(1);
        expect(views.boosters.charges.get('teleport')).toBe(1);
        expect(views.boosters.selected).toBeNull();
    });

    it('cancels aiming when the same booster is pressed again', () => {
        const { views } = setup(LAYOUT);

        views.boosters.boosterPressed.dispatch('bomb');
        views.boosters.boosterPressed.dispatch('bomb');
        views.board.cellTapped.dispatch(gridPos(2, 2));

        expect(views.boosters.selected).toBeNull();
        expect(views.board.rejected).toEqual([gridPos(2, 2)]);
    });

    it('shows the result once the level is over and restarts on request', async () => {
        const { views } = setup(LAYOUT, { targetScore: 30 });

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await views.board.finish();
        expect(views.result.shown!.status).toBe('won');

        views.board.cellTapped.dispatch(gridPos(0, 2));
        expect(views.board.played).toHaveLength(1);

        views.result.restartRequested.dispatch();
        expect(views.result.shown).toBeNull();
        expect(views.hud.last!.score).toBe(0);
    });
});
