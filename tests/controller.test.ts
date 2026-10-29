import { CellRelease } from '../assets/scripts/app/CellRelease';
import { Clock } from '../assets/scripts/app/Clock';
import { ControllerFeel, GameController } from '../assets/scripts/app/GameController';
import {
    BannerPresenter,
    BoardPresenter,
    BoosterPresenter,
    HudPresenter,
    ResultPresenter,
} from '../assets/scripts/app/GameViews';
import { Signal } from '../assets/scripts/app/Signal';
import { gridPos, GridPos } from '../assets/scripts/core/board/GridPos';
import { BoosterIds } from '../assets/scripts/core/boosters/BoosterIds';
import { LevelConfig } from '../assets/scripts/core/config/LevelConfig';
import { BlastGame } from '../assets/scripts/core/game/BlastGame';
import { createBlastGame } from '../assets/scripts/core/game/BlastGameFactory';
import { TurnStep } from '../assets/scripts/core/game/TurnStep';
import { ProgressSnapshot } from '../assets/scripts/core/rules/LevelProgress';
import { RewardGroup } from '../assets/scripts/core/rules/SuperTileRewards';
import { SuperKinds } from '../assets/scripts/core/tiles/SuperKinds';
import { boardFromText } from './helpers/boardText';
import { alwaysRed, testConfig } from './helpers/fixtures';

const { Bomb, Teleport } = BoosterIds;
const { hintDelay, tapMemory, finalePause } = ControllerFeel;

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
    readonly cellReleased = new Signal<CellRelease>();
    readonly cellPointed = new Signal<GridPos | null>();
    readonly played: Array<ReadonlyArray<TurnStep>> = [];
    readonly rejected: GridPos[] = [];
    targets: ReadonlyArray<GridPos> = [];
    tapPreview: ReadonlyArray<GridPos> = [];
    boosterPreview: ReadonlyArray<GridPos> = [];
    hint: ReadonlyArray<GridPos> = [];
    rewards: ReadonlyArray<RewardGroup> = [];
    accepting = false;
    renders = 0;
    renderFails = false;
    intros: Pending[] = [];
    private turn = new Pending();

    tap(cell: GridPos): void {
        this.cellReleased.dispatch({ pressed: cell, released: cell });
    }

    slide(from: GridPos, to: GridPos): void {
        this.cellReleased.dispatch({ pressed: from, released: to });
    }

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

    setAcceptingTaps(accepting: boolean): void {
        this.accepting = accepting;
    }

    showTargets(cells: ReadonlyArray<GridPos>): void {
        this.targets = cells.slice();
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

    showRewards(groups: ReadonlyArray<RewardGroup>): void {
        this.rewards = groups.slice();
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
    resets = 0;
    readonly warnings: number[] = [];
    fails = false;

    reset(progress: ProgressSnapshot): void {
        this.resets++;
        this.last = progress;
    }

    showProgress(progress: ProgressSnapshot): void {
        if (this.fails) {
            throw new Error('label exploded');
        }
        this.last = progress;
    }

    warnLowMoves(movesLeft: number): void {
        this.warnings.push(movesLeft);
    }
}

class FakeBoosters implements BoosterPresenter {
    readonly boosterPressed = new Signal<string>();
    readonly charges = new Map<string, number>();
    readonly rejected: string[] = [];
    selected: string | null = null;

    press(id: string): void {
        this.boosterPressed.dispatch(id);
    }

    showCharges(id: string, charges: number): void {
        this.charges.set(id, charges);
    }

    selectBooster(id: string | null): void {
        this.selected = id;
    }

    rejectBooster(id: string): void {
        this.rejected.push(id);
    }
}

class FakeResult implements ResultPresenter {
    readonly restartRequested = new Signal<void>();
    readonly celebrated: ProgressSnapshot[] = [];
    shown: ProgressSnapshot | null = null;
    fade: Pending | null = null;

    celebrate(progress: ProgressSnapshot): Promise<void> {
        this.celebrated.push(progress);
        return Promise.resolve();
    }

    show(progress: ProgressSnapshot): void {
        this.shown = progress;
    }

    /** Like the popup: at once when nothing is up, and the one running fade while it closes. */
    hide(): Promise<void> {
        if (this.shown !== null) {
            this.shown = null;
            this.fade = new Pending();
        }
        return this.fade === null ? Promise.resolve() : this.fade.promise;
    }
}

class FakeBanner implements BannerPresenter {
    readonly goals: ProgressSnapshot[] = [];
    readonly finales: number[] = [];
    dismissals = 0;
    banner = new Pending();

    showGoal(progress: ProgressSnapshot): Promise<void> {
        this.goals.push(progress);
        this.banner = new Pending();
        return this.banner.promise;
    }

    showFinale(movesLeft: number): Promise<void> {
        this.finales.push(movesLeft);
        return Promise.resolve();
    }

    dismiss(): void {
        this.dismissals++;
        void this.banner.resolve();
    }
}

interface FakeViews {
    readonly board: FakeBoard;
    readonly hud: FakeHud;
    readonly boosters: FakeBoosters;
    readonly result: FakeResult;
    readonly banner: FakeBanner;
}

/** Starts a game and leaves it in its intro: the deal and the goal banner are still on. */
async function launch(lines: string[], overrides: Partial<LevelConfig> = {}) {
    const views: FakeViews = {
        board: new FakeBoard(),
        hud: new FakeHud(),
        boosters: new FakeBoosters(),
        result: new FakeResult(),
        banner: new FakeBanner(),
    };
    const clock = new FakeClock();
    const config = testConfig({ cols: lines[0].length, rows: lines.length, ...overrides });
    const games: BlastGame[] = [];
    const controller = new GameController(
        () => {
            const game = createBlastGame(config, alwaysRed(), boardFromText(lines));
            games.push(game);
            return game;
        },
        views,
        clock,
    );
    controller.start();
    await flush();
    return { views, controller, clock, games };
}

/** Starts a game and plays its intro to the end, so the board takes input. */
async function setup(lines: string[], overrides: Partial<LevelConfig> = {}) {
    const game = await launch(lines, overrides);
    await game.views.banner.banner.resolve();
    await game.views.board.finishIntro();
    return game;
}

/** Lets every bonus turn play out, with the pause after each, until the result is up. */
async function playBonusRound(views: FakeViews, clock: FakeClock): Promise<void> {
    for (let turn = 0; views.result.shown === null && turn < 30; turn++) {
        await views.board.finish();
        clock.advance(finalePause);
        await flush();
    }
}

/** The only group on it is the RR pair in the top row. With alwaysRed, the refill brings that pair back. */
const LAYOUT = ['RRB', 'GBG', 'BGB'];
const PAIR = [gridPos(0, 2), gridPos(1, 2)];
const LONE = gridPos(2, 2);

describe('GameController', () => {
    afterEach(() => jest.restoreAllMocks());

    it('plays a turn and shows the new progress', async () => {
        const { views } = await setup(LAYOUT);

        views.board.tap(PAIR[0]);
        await views.board.finish();

        expect(views.board.played).toHaveLength(1);
        expect(views.hud.last!.movesLeft).toBe(9);
    });

    it('gives feedback on a tap that burns nothing', async () => {
        const { views } = await setup(LAYOUT);

        views.board.tap(LONE);

        expect(views.board.rejected).toEqual([LONE]);
        expect(views.board.played).toHaveLength(0);
    });

    it('takes a slide across the board for no tap', async () => {
        const { views } = await setup(LAYOUT);

        views.board.slide(PAIR[0], PAIR[1]);

        expect(views.board.played).toHaveLength(0);
        expect(views.board.rejected).toEqual([]);
    });

    it('aims a two-target booster, marks the first pick, then fires', async () => {
        const { views } = await setup(LAYOUT);

        views.boosters.press(Teleport);
        expect(views.boosters.selected).toBe(Teleport);

        views.board.tap(gridPos(0, 0));
        expect(views.board.targets).toEqual([gridPos(0, 0)]);

        views.board.tap(gridPos(1, 0));
        expect(views.board.played).toHaveLength(1);
        expect(views.boosters.charges.get(Teleport)).toBe(1);
        expect(views.boosters.selected).toBeNull();
        expect(views.board.targets).toEqual([]);
    });

    it('keeps the first teleport pick when the second one is refused', async () => {
        const { views } = await setup(LAYOUT);
        views.boosters.press(Teleport);
        views.board.tap(gridPos(0, 0));

        // Both are blue: swapping them would change nothing.
        views.board.tap(gridPos(2, 0));

        expect(views.board.rejected).toEqual([gridPos(2, 0)]);
        expect(views.boosters.selected).toBe(Teleport);
        expect(views.board.targets).toEqual([gridPos(0, 0)]);
        expect(views.boosters.charges.get(Teleport)).toBe(2);

        views.board.tap(gridPos(1, 0));
        expect(views.board.played).toHaveLength(1);
    });

    it('previews nothing over a second teleport pick that would be refused', async () => {
        const { views } = await setup(LAYOUT);
        views.boosters.press(Teleport);
        views.board.tap(gridPos(0, 0));

        views.board.cellPointed.dispatch(gridPos(2, 0));
        expect(views.board.boosterPreview).toEqual([]);

        views.board.cellPointed.dispatch(gridPos(1, 0));
        expect(views.board.boosterPreview).toEqual([gridPos(1, 0)]);

        views.board.cellPointed.dispatch(gridPos(0, 0));
        expect(views.board.boosterPreview).toEqual([gridPos(0, 0)]);
    });

    it('aims a booster at the cell a slide ends on', async () => {
        const { views } = await setup(LAYOUT);
        views.boosters.press(Bomb);

        views.board.slide(gridPos(0, 0), gridPos(1, 1));

        expect(views.board.played).toHaveLength(1);
        expect(views.boosters.charges.get(Bomb)).toBe(1);
    });

    it('cancels aiming when the same booster is pressed again', async () => {
        const { views } = await setup(LAYOUT);

        views.boosters.press(Bomb);
        views.boosters.press(Bomb);
        views.board.tap(LONE);

        expect(views.boosters.selected).toBeNull();
        expect(views.board.rejected).toEqual([LONE]);
    });

    it('refuses a booster without charges and keeps aiming the selected one', async () => {
        const { views } = await setup(LAYOUT, { bombCharges: 0 });

        views.boosters.press(Bomb);
        expect(views.boosters.rejected).toEqual([Bomb]);
        expect(views.boosters.selected).toBeNull();

        views.boosters.press(Teleport);
        views.boosters.press(Bomb);
        expect(views.boosters.rejected).toEqual([Bomb, Bomb]);
        expect(views.boosters.selected).toBe(Teleport);
    });

    it('lets a pressed tile look accepted only while taps count', async () => {
        const { views } = await launch(LAYOUT, { targetScore: 30, moves: 1 });
        expect(views.board.accepting).toBe(false);

        await views.banner.banner.resolve();
        await views.board.finishIntro();
        expect(views.board.accepting).toBe(true);

        views.board.tap(PAIR[0]);
        expect(views.board.accepting).toBe(true);

        await views.board.finish();
        expect(views.result.shown).not.toBeNull();
        expect(views.board.accepting).toBe(false);
    });
});

describe('GameController: taps during a turn', () => {
    it('replays the latest tap once the board rests, and only once', async () => {
        const { views, clock } = await setup(LAYOUT);
        views.board.tap(PAIR[0]);

        views.board.tap(PAIR[1]);
        clock.advance(tapMemory / 2);
        expect(views.board.played).toHaveLength(1);

        await views.board.finish();
        expect(views.board.played).toHaveLength(2);

        await views.board.finish();
        expect(views.board.played).toHaveLength(2);
    });

    it('drops a tap that waited longer than tapMemory', async () => {
        const { views, clock } = await setup(LAYOUT);
        views.board.tap(PAIR[0]);
        views.board.tap(PAIR[1]);

        clock.advance(tapMemory + 0.01);
        await views.board.finish();

        expect(views.board.played).toHaveLength(1);
    });

    it('drops a kept tap without a shake when its cell has nothing to burn', async () => {
        const { views } = await setup(LAYOUT);
        views.board.tap(PAIR[0]);

        views.board.tap(LONE);
        await views.board.finish();

        expect(views.board.played).toHaveLength(1);
        expect(views.board.rejected).toEqual([]);
    });

    it('keeps only the latest tap', async () => {
        const { views } = await setup(LAYOUT);
        views.board.tap(PAIR[0]);

        views.board.tap(PAIR[1]);
        views.board.tap(LONE);
        await views.board.finish();

        expect(views.board.played).toHaveLength(1);
    });

    it('keeps no slide', async () => {
        const { views } = await setup(LAYOUT);
        views.board.tap(PAIR[0]);

        views.board.slide(PAIR[1], PAIR[0]);
        await views.board.finish();

        expect(views.board.played).toHaveLength(1);
    });

    it('drops the kept tap on a booster press', async () => {
        const { views } = await setup(LAYOUT);
        views.board.tap(PAIR[0]);
        views.board.tap(PAIR[1]);

        views.boosters.press(Bomb);
        await views.board.finish();

        expect(views.board.played).toHaveLength(1);
        expect(views.boosters.selected).toBeNull();
    });

    it('drops the kept tap when the turn ends the level', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30, moves: 1 });
        views.board.tap(PAIR[0]);
        views.board.tap(PAIR[1]);

        await views.board.finish();

        expect(views.result.shown!.status).toBe('won');
        expect(views.board.played).toHaveLength(1);
    });
});

describe('GameController: end of the level', () => {
    afterEach(() => jest.restoreAllMocks());

    it('celebrates a win, plays each move left as a bonus turn, then shows the stars', async () => {
        const { views, clock, games } = await setup(LAYOUT, { targetScore: 30, starScores: [50, 80], moves: 4 });

        views.board.tap(PAIR[0]);
        await views.board.finish();

        expect(views.result.celebrated.map((p) => p.status)).toEqual(['won']);
        expect(views.banner.finales).toEqual([3]);
        expect(views.result.shown).toBeNull();

        await playBonusRound(views, clock);
        expect(views.board.played).toHaveLength(1 + 3);
        const verdict = views.result.shown!;
        expect(verdict.movesLeft).toBe(0);
        expect(verdict.stars).toBe(3);
        expect(verdict).toEqual(games[0].progressSnapshot);
        expect(views.hud.last).toEqual(verdict);
    });

    it('rests between two bonus turns', async () => {
        const { views, clock } = await setup(LAYOUT, { targetScore: 30, moves: 3 });
        views.board.tap(PAIR[0]);
        await views.board.finish();
        expect(views.board.played).toHaveLength(2);

        await views.board.finish();
        clock.advance(finalePause - 0.01);
        await flush();
        expect(views.board.played).toHaveLength(2);

        clock.advance(0.01);
        await flush();
        expect(views.board.played).toHaveLength(3);
    });

    it('takes no input through the celebration and the bonus round', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30, moves: 3 });
        views.board.tap(PAIR[0]);
        await views.board.finish();

        views.board.tap(PAIR[0]);
        views.boosters.press(Bomb);

        expect(views.board.played).toHaveLength(2);
        expect(views.boosters.selected).toBeNull();
        expect(views.board.accepting).toBe(false);
    });

    it('goes straight to the result when no move is left', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30, moves: 1 });

        views.board.tap(PAIR[0]);
        await views.board.finish();

        expect(views.result.celebrated).toHaveLength(1);
        expect(views.banner.finales).toEqual([]);
        expect(views.result.shown!.stars).toBe(1);
    });

    it('fires a super tile saved on the board even when the win took the last move', async () => {
        const { views, clock } = await setup(['RRB', 'GBG', 'BG-'], { targetScore: 30, moves: 1 });

        views.board.tap(PAIR[0]);
        await views.board.finish();
        expect(views.banner.finales).toEqual([0]);

        await playBonusRound(views, clock);
        expect(views.board.played).toHaveLength(2);
        expect(views.result.shown!.movesLeft).toBe(0);
    });

    it('shows a loss without a celebration', async () => {
        const { views } = await setup(LAYOUT, { moves: 1 });

        views.board.tap(PAIR[0]);
        await views.board.finish();

        expect(views.result.celebrated).toEqual([]);
        expect(views.result.shown!.status).toBe('lost');
    });

    it('stops the bonus round when disposed', async () => {
        const { views, controller, clock } = await setup(LAYOUT, { targetScore: 30, moves: 4 });
        views.board.tap(PAIR[0]);
        await views.board.finish();

        controller.dispose();
        await views.board.finish();
        clock.advance(finalePause);
        await flush();

        expect(views.board.played).toHaveLength(2);
        expect(views.result.shown).toBeNull();
    });

    it('leaves the bonus round behind when a new game starts during it', async () => {
        const { views, controller, clock } = await setup(LAYOUT, { targetScore: 30, moves: 4 });
        views.board.tap(PAIR[0]);
        await views.board.finish();

        controller.start();
        await flush();
        await views.board.finish();
        clock.advance(finalePause);
        await flush();

        expect(views.board.played).toHaveLength(2);
        expect(views.result.shown).toBeNull();
        expect(views.board.intros).toHaveLength(2);
        expect(views.hud.last!.score).toBe(0);

        await views.banner.banner.resolve();
        await views.board.finishIntro();
        views.board.tap(PAIR[0]);
        expect(views.board.played).toHaveLength(3);
    });

    it('shows the result when the bonus round breaks', async () => {
        const { views, games } = await setup(LAYOUT, { targetScore: 30, moves: 4 });
        const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(games[0], 'playFinale').mockImplementation(() => {
            throw new Error('finale exploded');
        });

        views.board.tap(PAIR[0]);
        await views.board.finish();

        expect(errorLog).toHaveBeenCalledWith('Game flow failed, recovering from the model', expect.any(Error));
        expect(views.board.renders).toBe(2);
        expect(views.result.shown!.status).toBe('won');
    });
});

describe('GameController: low moves', () => {
    async function playTurns(views: FakeViews, count: number): Promise<void> {
        for (let i = 0; i < count; i++) {
            views.board.tap(PAIR[0]);
            await views.board.finish();
        }
    }

    it('warns once, after the turn that brings the moves down to the limit', async () => {
        const { views } = await setup(LAYOUT, { moves: ControllerFeel.lowMoves + 2 });

        await playTurns(views, 1);
        expect(views.hud.warnings).toEqual([]);

        await playTurns(views, 2);
        expect(views.hud.warnings).toEqual([ControllerFeel.lowMoves]);
    });

    it('warns right after the intro when the level starts with few moves', async () => {
        const { views } = await setup(LAYOUT, { moves: 3 });

        expect(views.hud.warnings).toEqual([3]);
    });

    it('does not warn on the turn that wins the level', async () => {
        const { views, clock } = await setup(LAYOUT, { targetScore: 30, moves: ControllerFeel.lowMoves + 1 });

        await playTurns(views, 1);
        await playBonusRound(views, clock);

        expect(views.hud.warnings).toEqual([]);
    });

    it('warns again in the next game', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30, moves: 1 });
        await playTurns(views, 1);

        views.result.restartRequested.dispatch();
        await views.result.fade!.resolve();
        await views.banner.banner.resolve();
        await views.board.finishIntro();

        expect(views.hud.warnings).toEqual([1, 1]);
    });
});

describe('GameController: failures', () => {
    afterEach(() => jest.restoreAllMocks());

    it('redraws the board from the model and unlocks input when an animation fails', async () => {
        const { views } = await setup(LAYOUT);
        jest.spyOn(console, 'error').mockImplementation(() => {});

        views.board.tap(PAIR[0]);
        await views.board.crash();

        expect(views.board.renders).toBe(2);
        views.board.tap(LONE);
        expect(views.board.rejected).toHaveLength(1);
    });

    it('unlocks input even when the recovery redraw fails', async () => {
        const { views } = await setup(LAYOUT);
        jest.spyOn(console, 'error').mockImplementation(() => {});
        views.board.renderFails = true;

        views.board.tap(PAIR[0]);
        await views.board.crash();

        views.board.tap(LONE);
        expect(views.board.rejected).toHaveLength(1);
    });

    it('shows the result even when the recovery redraw fails', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30, moves: 1 });
        jest.spyOn(console, 'error').mockImplementation(() => {});
        views.board.renderFails = true;

        views.board.tap(PAIR[0]);
        await views.board.crash();

        expect(views.result.shown!.status).toBe('won');
    });

    it('plays the turn on when the HUD throws, and offers a hint after it', async () => {
        const { views, clock } = await setup(LAYOUT);
        const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
        views.hud.fails = true;

        views.board.tap(PAIR[0]);
        expect(views.board.played).toHaveLength(1);
        await views.board.finish();

        expect(errorLog).toHaveBeenCalledWith('HUD failed', expect.any(Error));
        expect(views.board.renders).toBe(1);
        clock.advance(hintDelay);
        expect(views.board.hint).toHaveLength(2);
    });

    it('keeps the turn going when a cue throws', async () => {
        const { views } = await setup(LAYOUT);
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(views.board, 'showTapPreview').mockImplementation(() => {
            throw new Error('glow exploded');
        });

        views.board.tap(PAIR[0]);

        expect(views.board.played).toHaveLength(1);
    });
});

describe('GameController: level intro', () => {
    afterEach(() => jest.restoreAllMocks());

    it('announces the goal of the new game', async () => {
        const { views } = await launch(LAYOUT, { targetScore: 3200, moves: 30 });

        expect(views.banner.goals).toHaveLength(1);
        expect(views.banner.goals[0].targetScore).toBe(3200);
        expect(views.banner.goals[0].movesLeft).toBe(30);
        expect(views.hud.resets).toBe(1);
    });

    it('locks input until both the deal and the banner are over', async () => {
        const { views } = await launch(LAYOUT);
        views.board.cellPointed.dispatch(PAIR[0]);

        await views.board.finishIntro();
        expect(views.board.tapPreview).toEqual([]);
        expect(views.board.accepting).toBe(false);

        await views.banner.banner.resolve();
        expect(views.board.tapPreview).toEqual(expect.arrayContaining(PAIR));
        views.board.tap(PAIR[0]);
        expect(views.board.played).toHaveLength(1);
    });

    it('sends the goal banner away on a tap or a booster press, and plays neither', async () => {
        const { views } = await launch(LAYOUT);

        views.boosters.press(Bomb);
        views.board.tap(PAIR[0]);
        await views.board.finishIntro();

        expect(views.banner.dismissals).toBe(2);
        expect(views.boosters.selected).toBeNull();
        expect(views.board.played).toHaveLength(0);
        views.board.tap(PAIR[0]);
        expect(views.board.played).toHaveLength(1);
    });

    it('deals the next game only once the result panel has faded', async () => {
        const { views } = await setup(LAYOUT, { targetScore: 30, moves: 1 });
        views.board.tap(PAIR[0]);
        await views.board.finish();

        views.result.restartRequested.dispatch();
        await flush();
        expect(views.board.renders).toBe(1);
        expect(views.board.intros).toHaveLength(1);

        await views.result.fade!.resolve();
        expect(views.board.renders).toBe(2);
        expect(views.board.intros).toHaveLength(2);
        expect(views.banner.goals).toHaveLength(2);
        expect(views.hud.resets).toBe(2);
        expect(views.hud.last!.score).toBe(0);
    });

    it('deals once when restart is asked twice while the panel fades', async () => {
        const { views, games } = await setup(LAYOUT, { targetScore: 30, moves: 1 });
        views.board.tap(PAIR[0]);
        await views.board.finish();

        views.result.restartRequested.dispatch();
        views.result.restartRequested.dispatch();
        await views.result.fade!.resolve();

        expect(games).toHaveLength(3);
        expect(views.board.intros).toHaveLength(2);
        expect(views.banner.goals).toHaveLength(2);
    });

    it('redraws the board and unlocks input when the deal fails', async () => {
        const { views } = await launch(LAYOUT);
        jest.spyOn(console, 'error').mockImplementation(() => {});

        await views.banner.banner.resolve();
        await views.board.intros[0].reject(new Error('tween exploded'));

        expect(views.board.renders).toBe(2);
        views.board.tap(PAIR[0]);
        expect(views.board.played).toHaveLength(1);
    });

    it('stays locked when disposed during the intro', async () => {
        const { views, controller, clock } = await launch(LAYOUT);
        const select = jest.spyOn(views.boosters, 'selectBooster');

        controller.dispose();
        await views.banner.banner.resolve();
        await views.board.finishIntro();
        clock.advance(hintDelay);

        expect(select).not.toHaveBeenCalled();
        expect(views.board.hint).toEqual([]);
    });

    it('stays locked when disposed during a turn', async () => {
        const { views, controller, clock } = await setup(LAYOUT);
        views.board.tap(PAIR[0]);
        const tapPreview = jest.spyOn(views.board, 'showTapPreview');

        controller.dispose();
        await views.board.finish();
        clock.advance(hintDelay);

        expect(tapPreview).not.toHaveBeenCalled();
        expect(views.board.hint).toEqual([]);
    });
});

describe('GameController: idle hint', () => {
    it('shows the best move after the player has been idle for a while', async () => {
        const { views, clock } = await setup(LAYOUT);

        clock.advance(hintDelay - 0.1);
        expect(views.board.hint).toEqual([]);

        clock.advance(0.1);
        expect(views.board.hint).toEqual(expect.arrayContaining(PAIR));
        expect(views.board.hint).toHaveLength(2);
    });

    it('takes the hint back on any input and waits again from there', async () => {
        const { views, clock } = await setup(LAYOUT);
        clock.advance(hintDelay);

        views.board.cellPointed.dispatch(LONE);
        expect(views.board.hint).toEqual([]);

        clock.advance(hintDelay - 0.1);
        views.board.tap(LONE);
        clock.advance(hintDelay - 0.1);
        expect(views.board.hint).toEqual([]);

        clock.advance(0.1);
        expect(views.board.hint).toHaveLength(2);
    });

    it('gives no hint during the intro', async () => {
        const { views, clock } = await launch(LAYOUT);

        clock.advance(hintDelay * 3);

        expect(views.board.hint).toEqual([]);
    });

    it('gives no hint while a turn plays, and clears a shown one when it starts', async () => {
        const { views, clock } = await setup(LAYOUT);
        clock.advance(hintDelay);

        views.board.tap(PAIR[0]);
        expect(views.board.hint).toEqual([]);
        clock.advance(hintDelay * 3);
        expect(views.board.hint).toEqual([]);

        await views.board.finish();
        clock.advance(hintDelay);
        expect(views.board.hint).toHaveLength(2);
    });

    it('gives no hint while a booster is aimed', async () => {
        const { views, clock } = await setup(LAYOUT);

        views.boosters.press(Bomb);
        clock.advance(hintDelay * 3);
        expect(views.board.hint).toEqual([]);

        views.boosters.press(Bomb);
        clock.advance(hintDelay);
        expect(views.board.hint).toHaveLength(2);
    });
});

describe('GameController: previews', () => {
    it('lifts the group a tap at the pointer would burn', async () => {
        const { views } = await setup(LAYOUT);

        views.board.cellPointed.dispatch(PAIR[1]);
        expect(views.board.tapPreview).toEqual(expect.arrayContaining(PAIR));

        views.board.cellPointed.dispatch(LONE);
        expect(views.board.tapPreview).toEqual([]);

        views.board.cellPointed.dispatch(PAIR[0]);
        views.board.cellPointed.dispatch(null);
        expect(views.board.tapPreview).toEqual([]);
    });

    it('badges the groups that earn a super tile whenever the board rests', async () => {
        const superTiles = [{ minGroupSize: 2, kinds: [SuperKinds.Bomb] }];
        const { views, games } = await setup(LAYOUT, { superTiles });
        expect(views.board.rewards).toEqual([{ cells: expect.arrayContaining(PAIR), kinds: [SuperKinds.Bomb] }]);

        const stale = [{ cells: [LONE], kinds: [] }];
        views.board.rewards = stale;
        views.board.tap(PAIR[0]);
        expect(views.board.rewards).toBe(stale);

        await views.board.finish();
        expect(views.board.rewards).not.toBe(stale);
        expect(views.board.rewards).toEqual(games[0].rewards());
    });

    it('previews what the aimed booster would hit at the pointer', async () => {
        const { views } = await setup(LAYOUT);
        views.board.cellPointed.dispatch(PAIR[0]);

        views.boosters.press(Bomb);
        expect(views.board.tapPreview).toEqual([]);
        expect(views.board.boosterPreview).toHaveLength(4);

        views.board.cellPointed.dispatch(gridPos(1, 1));
        expect(views.board.boosterPreview).toHaveLength(9);

        views.boosters.press(Teleport);
        expect(views.board.boosterPreview).toEqual([gridPos(1, 1)]);

        views.board.cellPointed.dispatch(null);
        expect(views.board.boosterPreview).toEqual([]);
    });

    it('goes back to the tap preview when aiming is cancelled', async () => {
        const { views } = await setup(LAYOUT);
        views.boosters.press(Bomb);
        views.board.cellPointed.dispatch(PAIR[0]);

        views.boosters.press(Bomb);

        expect(views.board.boosterPreview).toEqual([]);
        expect(views.board.tapPreview).toEqual(expect.arrayContaining(PAIR));
    });

    it('clears every cue when a turn starts and lifts the group under the pointer after it', async () => {
        const { views } = await setup(LAYOUT);
        views.boosters.press(Teleport);
        views.board.tap(gridPos(0, 0));
        views.board.cellPointed.dispatch(gridPos(1, 0));

        views.board.tap(gridPos(1, 0));
        expect(views.board.played).toHaveLength(1);
        expect(views.board.boosterPreview).toEqual([]);
        expect(views.board.targets).toEqual([]);
        expect(views.board.tapPreview).toEqual([]);
        expect(views.boosters.selected).toBeNull();

        views.board.cellPointed.dispatch(PAIR[1]);
        expect(views.board.tapPreview).toEqual([]);

        await views.board.finish();
        expect(views.board.tapPreview.length).toBeGreaterThan(0);
    });
});
