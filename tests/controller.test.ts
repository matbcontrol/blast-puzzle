import { Clock } from '../assets/scripts/app/Clock';
import { GameController } from '../assets/scripts/app/GameController';
import {
    BannerPresenter,
    BoardPresenter,
    BoosterPresenter,
    HudPresenter,
    ResultPresenter,
} from '../assets/scripts/app/GameViews';
import { HINT_DELAY } from '../assets/scripts/app/IdleHint';
import { Signal } from '../assets/scripts/app/Signal';
import { gridPos, GridPos } from '../assets/scripts/core/board/GridPos';
import { LevelConfig } from '../assets/scripts/core/config/LevelConfig';
import { createBlastGame } from '../assets/scripts/core/game/BlastGameFactory';
import { TurnStep } from '../assets/scripts/core/game/TurnStep';
import { ProgressSnapshot } from '../assets/scripts/core/rules/LevelProgress';
import { boardFromText } from './helpers/boardText';
import { alwaysRed, testConfig } from './helpers/fixtures';

const flush = () => new Promise((resolve) => setImmediate(resolve));

/** A promise the test settles by hand, so it decides when an animation ends. */
class Pending {
    readonly promise: Promise<void>;
    private settle: (error?: Error) => void = () => {};

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.settle = (error) => (error === undefined ? resolve() : reject(error));
        });
    }

    async resolve(): Promise<void> {
        this.settle();
        await flush();
    }

    async reject(error: Error): Promise<void> {
        this.settle(error);
        await flush();
    }
}

class FakeClock implements Clock {
    private now = 0;
    private timers: Array<{ at: number; fn: () => void; cancelled: boolean }> = [];

    schedule(seconds: number, fn: () => void): () => void {
        const timer = { at: this.now + seconds, fn, cancelled: false };
        this.timers.push(timer);
        return () => {
            timer.cancelled = true;
        };
    }

    advance(seconds: number): void {
        this.now += seconds;
        const due = this.timers.filter((timer) => !timer.cancelled && timer.at <= this.now);
        this.timers = this.timers.filter((timer) => !timer.cancelled && timer.at > this.now);
        due.forEach((timer) => timer.fn());
    }
}

class FakeBoard implements BoardPresenter {
    readonly cellTapped = new Signal<GridPos>();
    readonly cellPointed = new Signal<GridPos | null>();
    readonly played: Array<ReadonlyArray<TurnStep>> = [];
    readonly rejected: GridPos[] = [];
    marked: ReadonlyArray<GridPos> = [];
    tapPreview: ReadonlyArray<GridPos> = [];
    boosterPreview: ReadonlyArray<GridPos> = [];
    hint: ReadonlyArray<GridPos> | null = null;
    renders = 0;
    renderFails = false;
    intros: Pending[] = [];
    private turn = new Pending();

    render(): void {
        this.renders++;
        if (this.renderFails) {
            throw new Error('render exploded');
        }
    }

    intro(): Promise<void> {
        const deal = new Pending();
        this.intros.push(deal);
        return deal.promise;
    }

    play(steps: ReadonlyArray<TurnStep>): Promise<void> {
        this.played.push(steps);
        this.turn = new Pending();
        return this.turn.promise;
    }

    rejectTap(at: GridPos): void {
        this.rejected.push(at);
    }

    markTargets(cells: ReadonlyArray<GridPos>): void {
        this.marked = cells.slice();
    }

    showTapPreview(cells: ReadonlyArray<GridPos>): void {
        this.tapPreview = cells.slice();
    }

    showBoosterPreview(cells: ReadonlyArray<GridPos>): void {
        this.boosterPreview = cells.slice();
    }

    showHint(cells: ReadonlyArray<GridPos>): void {
        this.hint = cells.slice();
    }

    clearHint(): void {
        this.hint = null;
    }

    /** Lets the pending animation finish and the controller react to it. */
    finish(): Promise<void> {
        return this.turn.resolve();
    }

    crash(): Promise<void> {
        return this.turn.reject(new Error('tween exploded'));
    }

    finishIntro(): Promise<void> {
        return this.intros[this.intros.length - 1].resolve();
    }
}

class FakeHud implements HudPresenter {
    last: ProgressSnapshot | null = null;
    fails = false;
    showProgress(progress: ProgressSnapshot): void {
        if (this.fails) {
            throw new Error('label exploded');
        }
        this.last = progress;
    }
}

class FakeBoosters implements BoosterPresenter {
    readonly boosterPressed = new Signal<string>();
    readonly charges = new Map<string, number>();
    readonly rejected: string[] = [];
    selected: string | null = null;
    showCharges(id: string, charges: number): void {
        this.charges.set(id, charges);
    }
    select(id: string | null): void {
        this.selected = id;
    }
    rejectPress(id: string): void {
        this.rejected.push(id);
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

class FakeBanner implements BannerPresenter {
    readonly goals: ProgressSnapshot[] = [];
    banner = new Pending();
    showGoal(progress: ProgressSnapshot): Promise<void> {
        this.goals.push(progress);
        this.banner = new Pending();
        return this.banner.promise;
    }
}

/** Starts a game and leaves it in its intro: the deal and the goal banner are still on. */
function launch(lines: string[], overrides: Partial<LevelConfig> = {}) {
    const views = {
        board: new FakeBoard(),
        hud: new FakeHud(),
        boosters: new FakeBoosters(),
        result: new FakeResult(),
        banner: new FakeBanner(),
    };
    const clock = new FakeClock();
    const config = testConfig({ cols: lines[0].length, rows: lines.length, ...overrides });
    const controller = new GameController(
        () => createBlastGame(config, alwaysRed(), boardFromText(lines)),
        views,
        clock,
    );
    controller.start();
    return { views, controller, clock };
}

/** Starts a game and plays its intro to the end, so the board takes input. */
async function setup(lines: string[], overrides: Partial<LevelConfig> = {}) {
    const game = launch(lines, overrides);
    await game.views.banner.banner.resolve();
    await game.views.board.finishIntro();
    return game;
}

/** The only group on it is the RR pair in the top row. */
const LAYOUT = ['RRB', 'GBG', 'BGB'];
const PAIR = [gridPos(0, 2), gridPos(1, 2)];

describe('GameController', () => {
    afterEach(() => jest.restoreAllMocks());

    it('plays a turn and shows the new progress', async () => {
        const { views } = await setup(LAYOUT);

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await views.board.finish();

        expect(views.board.played).toHaveLength(1);
        expect(views.hud.last!.movesLeft).toBe(9);
    });

    it('ignores taps while a turn is animating', async () => {
        const { views } = await setup(LAYOUT);

        views.board.cellTapped.dispatch(gridPos(0, 2));
        views.board.cellTapped.dispatch(gridPos(0, 2));

        expect(views.board.played).toHaveLength(1);
    });

    it('gives feedback on a tap that burns nothing', async () => {
        const { views } = await setup(LAYOUT);

        views.board.cellTapped.dispatch(gridPos(2, 2));

        expect(views.board.rejected).toEqual([gridPos(2, 2)]);
        expect(views.board.played).toHaveLength(0);
    });

    it('aims a two-target booster, marks the first pick, then fires', async () => {
        const { views } = await setup(LAYOUT);

        views.boosters.boosterPressed.dispatch('teleport');
        expect(views.boosters.selected).toBe('teleport');

        views.board.cellTapped.dispatch(gridPos(0, 0));
        expect(views.board.marked).toEqual([gridPos(0, 0)]);

        views.board.cellTapped.dispatch(gridPos(1, 0));
        expect(views.board.played).toHaveLength(1);
        expect(views.boosters.charges.get('teleport')).toBe(1);
        expect(views.boosters.selected).toBeNull();
    });

    it('cancels aiming when the same booster is pressed again', async () => {
        const { views } = await setup(LAYOUT);

        views.boosters.boosterPressed.dispatch('bomb');
        views.boosters.boosterPressed.dispatch('bomb');
        views.board.cellTapped.dispatch(gridPos(2, 2));

        expect(views.boosters.selected).toBeNull();
        expect(views.board.rejected).toEqual([gridPos(2, 2)]);
    });

    it('refuses a booster without charges and keeps aiming the selected one', async () => {
        const { views } = await setup(LAYOUT, { bombCharges: 0 });

        views.boosters.boosterPressed.dispatch('bomb');
        expect(views.boosters.rejected).toEqual(['bomb']);
        expect(views.boosters.selected).toBeNull();

        views.boosters.boosterPressed.dispatch('teleport');
        views.boosters.boosterPressed.dispatch('bomb');
        expect(views.boosters.rejected).toEqual(['bomb', 'bomb']);
        expect(views.boosters.selected).toBe('teleport');
    });

    it('shows the result once the level is over and restarts on request', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30 });

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await views.board.finish();
        expect(views.result.shown!.status).toBe('won');

        views.board.cellTapped.dispatch(gridPos(0, 2));
        expect(views.board.played).toHaveLength(1);

        views.result.restartRequested.dispatch();
        expect(views.result.shown).toBeNull();
        expect(views.hud.last!.score).toBe(0);
    });

    it('redraws the board from the model and unlocks input when an animation fails', async () => {
        const { views } = await setup(LAYOUT);
        jest.spyOn(console, 'error').mockImplementation(() => {});

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await views.board.crash();

        expect(views.board.renders).toBe(2);
        views.board.cellTapped.dispatch(gridPos(2, 2));
        expect(views.board.rejected).toHaveLength(1);
    });

    it('unlocks input even when the recovery redraw fails', async () => {
        const { views } = await setup(LAYOUT);
        jest.spyOn(console, 'error').mockImplementation(() => {});
        views.board.renderFails = true;

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await views.board.crash();

        views.board.cellTapped.dispatch(gridPos(2, 2));
        expect(views.board.rejected).toHaveLength(1);
    });

    it('shows the result even when the recovery redraw fails', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30 });
        jest.spyOn(console, 'error').mockImplementation(() => {});
        views.board.renderFails = true;

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await views.board.crash();

        expect(views.result.shown!.status).toBe('won');
    });

    it('logs the error and unlocks input when a view throws mid-turn', async () => {
        const { views } = await setup(LAYOUT);
        const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
        views.hud.fails = true;

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await flush();

        expect(errorLog).toHaveBeenCalledWith('Turn failed, unlocking input', expect.any(Error));
        views.board.cellTapped.dispatch(gridPos(2, 2));
        expect(views.board.rejected).toHaveLength(1);
    });
});

describe('GameController: level intro', () => {
    afterEach(() => jest.restoreAllMocks());

    it('announces the goal of the new game', () => {
        const { views } = launch(LAYOUT, { targetScore: 3200, moves: 30 });

        expect(views.banner.goals).toHaveLength(1);
        expect(views.banner.goals[0].targetScore).toBe(3200);
        expect(views.banner.goals[0].movesLeft).toBe(30);
    });

    it('locks input until both the deal and the banner are over', async () => {
        const { views } = launch(LAYOUT);

        views.board.cellTapped.dispatch(gridPos(0, 2));
        views.boosters.boosterPressed.dispatch('bomb');
        await views.board.finishIntro();
        views.board.cellTapped.dispatch(gridPos(0, 2));
        expect(views.board.played).toHaveLength(0);
        expect(views.boosters.selected).toBeNull();

        await views.banner.banner.resolve();
        views.board.cellTapped.dispatch(gridPos(0, 2));
        expect(views.board.played).toHaveLength(1);
    });

    it('deals the board again on restart', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30 });

        views.board.cellTapped.dispatch(gridPos(0, 2));
        await views.board.finish();
        views.result.restartRequested.dispatch();

        expect(views.board.intros).toHaveLength(2);
        expect(views.banner.goals).toHaveLength(2);
    });

    it('redraws the board and unlocks input when the deal fails', async () => {
        const { views } = launch(LAYOUT);
        jest.spyOn(console, 'error').mockImplementation(() => {});

        await views.banner.banner.resolve();
        await views.board.intros[0].reject(new Error('tween exploded'));

        expect(views.board.renders).toBe(2);
        views.board.cellTapped.dispatch(gridPos(0, 2));
        expect(views.board.played).toHaveLength(1);
    });

    it('stays locked when disposed during the intro', async () => {
        const { views, controller, clock } = launch(LAYOUT);
        const select = jest.spyOn(views.boosters, 'select');

        controller.dispose();
        await views.banner.banner.resolve();
        await views.board.finishIntro();
        clock.advance(HINT_DELAY);

        expect(select).not.toHaveBeenCalled();
        expect(views.board.hint).toBeNull();
    });
});

describe('GameController: idle hint', () => {
    it('shows the best move after the player has been idle for a while', async () => {
        const { views, clock } = await setup(LAYOUT);

        clock.advance(HINT_DELAY - 0.1);
        expect(views.board.hint).toBeNull();

        clock.advance(0.1);
        expect(views.board.hint).toEqual(expect.arrayContaining(PAIR));
        expect(views.board.hint).toHaveLength(2);
    });

    it('takes the hint back on any input and waits again from there', async () => {
        const { views, clock } = await setup(LAYOUT);
        clock.advance(HINT_DELAY);

        views.board.cellPointed.dispatch(gridPos(2, 2));
        expect(views.board.hint).toBeNull();

        clock.advance(HINT_DELAY - 0.1);
        views.board.cellTapped.dispatch(gridPos(2, 2));
        clock.advance(HINT_DELAY - 0.1);
        expect(views.board.hint).toBeNull();

        clock.advance(0.1);
        expect(views.board.hint).not.toBeNull();
    });

    it('gives no hint during the intro', () => {
        const { views, clock } = launch(LAYOUT);

        clock.advance(HINT_DELAY * 3);

        expect(views.board.hint).toBeNull();
    });

    it('gives no hint while a turn plays, and clears a shown one when it starts', async () => {
        const { views, clock } = await setup(LAYOUT);
        clock.advance(HINT_DELAY);

        views.board.cellTapped.dispatch(gridPos(0, 2));
        expect(views.board.hint).toBeNull();
        clock.advance(HINT_DELAY * 3);
        expect(views.board.hint).toBeNull();

        await views.board.finish();
        clock.advance(HINT_DELAY);
        expect(views.board.hint).not.toBeNull();
    });

    it('gives no hint while a booster is aimed', async () => {
        const { views, clock } = await setup(LAYOUT);

        views.boosters.boosterPressed.dispatch('bomb');
        clock.advance(HINT_DELAY * 3);
        expect(views.board.hint).toBeNull();

        views.boosters.boosterPressed.dispatch('bomb');
        clock.advance(HINT_DELAY);
        expect(views.board.hint).not.toBeNull();
    });
});

describe('GameController: previews', () => {
    it('lifts the group a tap at the pointer would burn', async () => {
        const { views } = await setup(LAYOUT);

        views.board.cellPointed.dispatch(gridPos(1, 2));
        expect(views.board.tapPreview).toEqual(expect.arrayContaining(PAIR));

        views.board.cellPointed.dispatch(gridPos(2, 2));
        expect(views.board.tapPreview).toEqual([]);

        views.board.cellPointed.dispatch(gridPos(0, 2));
        views.board.cellPointed.dispatch(null);
        expect(views.board.tapPreview).toEqual([]);
    });

    it('previews what the aimed booster would hit at the pointer', async () => {
        const { views } = await setup(LAYOUT);
        views.board.cellPointed.dispatch(gridPos(0, 2));

        views.boosters.boosterPressed.dispatch('bomb');
        expect(views.board.tapPreview).toEqual([]);
        expect(views.board.boosterPreview).toHaveLength(4);

        views.board.cellPointed.dispatch(gridPos(1, 1));
        expect(views.board.boosterPreview).toHaveLength(9);

        views.boosters.boosterPressed.dispatch('teleport');
        expect(views.board.boosterPreview).toEqual([gridPos(1, 1)]);

        views.board.cellPointed.dispatch(null);
        expect(views.board.boosterPreview).toEqual([]);
    });

    it('goes back to the tap preview when aiming is cancelled', async () => {
        const { views } = await setup(LAYOUT);
        views.boosters.boosterPressed.dispatch('bomb');
        views.board.cellPointed.dispatch(gridPos(0, 2));

        views.boosters.boosterPressed.dispatch('bomb');

        expect(views.board.boosterPreview).toEqual([]);
        expect(views.board.tapPreview).toEqual(expect.arrayContaining(PAIR));
    });

    it('clears every cue when a turn starts and lifts the group under the pointer after it', async () => {
        const { views } = await setup(LAYOUT);
        views.boosters.boosterPressed.dispatch('bomb');
        views.board.cellPointed.dispatch(gridPos(0, 2));

        views.board.cellTapped.dispatch(gridPos(0, 2));
        expect(views.board.played).toHaveLength(1);
        expect(views.board.boosterPreview).toEqual([]);
        expect(views.board.tapPreview).toEqual([]);
        expect(views.boosters.selected).toBeNull();

        views.board.cellPointed.dispatch(gridPos(1, 2));
        expect(views.board.tapPreview).toEqual([]);

        await views.board.finish();
        expect(views.board.tapPreview.length).toBeGreaterThan(0);
    });
});
