import { GridPos } from '../core/board/GridPos';
import { BlastGame, TurnResult } from '../core/game/BlastGame';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Clock } from './Clock';
import { GameViews } from './GameViews';
import { IdleHint } from './IdleHint';
import { BoosterAimingInput } from './input/BoosterAimingInput';
import { IdleInput } from './input/IdleInput';
import { InputCommands, InputCues, InputState } from './input/InputState';
import { IntroInput } from './input/IntroInput';
import { LockedInput } from './input/LockedInput';
import { TapBuffer } from './input/TapBuffer';
import { TurnLockedInput } from './input/TurnLockedInput';

/** The pace of the game flow in seconds, and the moves left that count as running low. */
export const ControllerFeel = {
    /** Idle time before the board suggests a move. */
    hintDelay: 5,
    /** A tap made while a turn animates is replayed if the board rests within this time, dropped after it. */
    tapMemory: 0.3,
    /** Rest after each bonus move, so every one of them reads on its own. */
    finalePause: 0.15,
    lowMoves: 5,
};

/** One game, from start() until the next start() or dispose() cancels it. */
interface Run {
    cancelled: boolean;
}

/**
 * Glues the model to the screen: routes input to the game and replays turn results on the views.
 * The model moves first and the board follows one turn at a time. Input waits while a turn animates,
 * so a fast double tap can never desync them; a tap made meanwhile is kept and replayed once the board rests.
 */
export class GameController {
    private game: BlastGame | null = null;
    /**
     * Every async flow holds the run it started in and stops after any await that finds it cancelled.
     * A token rather than `this.game === game`, so the check does not rely on newGame() returning a new object.
     */
    private run: Run = { cancelled: false };
    private input: InputState = new LockedInput();
    /** Kept across states, so a new state shows its cues where the pointer already rests. */
    private pointer: GridPos | null = null;
    private lowMovesWarned = false;
    private readonly hint: IdleHint;
    private readonly taps: TapBuffer;
    private readonly subscriptions: Array<() => void>;

    // Only input states get these, so nothing outside can tap past the lock.
    private readonly commands: InputCommands = {
        enterIdle: () => this.enterIdle(),
        enterAiming: (boosterId) => this.enterAiming(boosterId),
        tap: (at) => this.tap(at),
        useBooster: (id, targets) => this.useBooster(id, targets),
    };

    private readonly cues: InputCues = {
        showTargets: (cells) => this.views.board.showTargets(cells),
        showTapPreview: (cells) => this.views.board.showTapPreview(cells),
        showBoosterPreview: (cells) => this.views.board.showBoosterPreview(cells),
        selectBooster: (id) => this.views.boosters.selectBooster(id),
        rejectBooster: (id) => this.views.boosters.rejectBooster(id),
    };

    constructor(
        private readonly newGame: () => BlastGame,
        private readonly views: GameViews,
        private readonly clock: Clock,
    ) {
        this.hint = new IdleHint(clock, ControllerFeel.hintDelay, () => this.currentGame().hint(), views.board);
        this.taps = new TapBuffer(clock, ControllerFeel.tapMemory);
        this.subscriptions = [
            views.board.cellReleased.add((release) => this.handleInput((input) => input.onCellReleased(release))),
            views.board.cellPointed.add((cell) => {
                this.pointer = cell;
                this.handleInput((input) => input.onCellPointed(cell));
            }),
            views.boosters.boosterPressed.add((id) => this.handleInput((input) => input.onBoosterPressed(id))),
            views.result.restartRequested.add(() => this.start()),
        ];
    }

    /** Deals a new game once the last result panel is gone, and announces its goal. */
    start(): void {
        const run = this.beginRun();
        const game = this.newGame();
        this.game = game;
        this.lowMovesWarned = false;
        this.taps.clear();
        this.setInput(new LockedInput());
        this.deal(run, game).catch((error) => this.recover(run, game, error));
    }

    /** No exit() for the current state: the views may already be going away with the scene. */
    dispose(): void {
        this.subscriptions.forEach((unsubscribe) => unsubscribe());
        this.run.cancelled = true;
        this.hint.stop();
        this.taps.clear();
        this.input = new LockedInput();
        this.game = null;
    }

    /** Any input takes a shown hint back and starts the wait for the next one. */
    private handleInput(route: (input: InputState) => void): void {
        this.hint.stop();
        route(this.input);
        if (this.input.offersHint) {
            this.hint.restart();
        }
    }

    private async deal(run: Run, game: BlastGame): Promise<void> {
        await this.awaitView('Result popup failed', () => this.views.result.hide());
        if (run.cancelled) {
            return;
        }
        this.redrawBoard(game);
        this.tryView('HUD failed', () => {
            this.views.hud.reset(game.progressSnapshot);
            this.showCharges(game);
        });
        this.setInput(new IntroInput(() => this.views.banner.dismiss()));
        const goal = game.progressSnapshot;
        await Promise.all([
            this.animateBoard(run, game, () => this.views.board.intro()),
            this.awaitView('Goal banner failed', () => this.views.banner.showGoal(goal)),
        ]);
        if (run.cancelled) {
            return;
        }
        this.resume(game);
    }

    private enterIdle(): void {
        this.setInput(new IdleInput(this.commands, this.currentGame(), this.cues));
    }

    private enterAiming(boosterId: string): void {
        this.setInput(new BoosterAimingInput(this.commands, this.currentGame(), this.cues, boosterId));
    }

    private tap(at: GridPos): void {
        const game = this.currentGame();
        const result = game.tap(at);
        if (result === null) {
            this.views.board.rejectTap(at);
            return;
        }
        this.playTurn(game, result);
    }

    private useBooster(id: string, targets: ReadonlyArray<GridPos>): boolean {
        const game = this.currentGame();
        const result = game.useBooster(id, targets);
        if (result === null) {
            this.views.board.rejectTap(targets[targets.length - 1]);
            return false;
        }
        this.playTurn(game, result);
        return true;
    }

    private playTurn(game: BlastGame, result: TurnResult): void {
        const run = this.run;
        this.animateTurn(run, game, result).catch((error) => this.recover(run, game, error));
    }

    private async animateTurn(run: Run, game: BlastGame, result: TurnResult): Promise<void> {
        this.setInput(new TurnLockedInput(this.taps));
        await this.showTurn(run, game, result);
        if (run.cancelled) {
            return;
        }
        if (result.progress.status === 'playing') {
            this.resume(game);
        } else {
            await this.endLevel(run, game, result.progress);
        }
    }

    /** The HUD jumps to the progress after the turn while the board replays how it got there. */
    private async showTurn(run: Run, game: BlastGame, turn: TurnResult): Promise<void> {
        this.tryView('HUD failed', () => this.showProgress(game, turn.progress));
        await this.animateBoard(run, game, () => this.views.board.play(turn.steps));
    }

    /** The board rests and the game goes on. A tap kept from the animation plays if it still does something. */
    private resume(game: BlastGame): void {
        this.warnIfLowOnMoves(game.progressSnapshot);
        const kept = this.taps.take();
        this.showRewards(game);
        this.enterIdle();
        if (kept !== null && game.tapPreview(kept.released).length > 0) {
            this.handleInput((input) => input.onCellReleased(kept));
        }
    }

    private async endLevel(run: Run, game: BlastGame, progress: ProgressSnapshot): Promise<void> {
        this.taps.clear();
        this.setInput(new LockedInput());
        let verdict = progress;
        if (progress.status === 'won') {
            await this.awaitView('Win celebration failed', () => this.views.result.celebrate(progress));
            if (run.cancelled) {
                return;
            }
            verdict = await this.playBonusMoves(run, game, progress);
            if (run.cancelled) {
                return;
            }
        }
        this.tryView('Result popup failed', () => this.views.result.show(verdict));
    }

    /** Every move left after the win goes off as a bonus super tile, one turn at a time. */
    private async playBonusMoves(run: Run, game: BlastGame, won: ProgressSnapshot): Promise<ProgressSnapshot> {
        let turn = game.playFinale();
        if (turn !== null) {
            await this.awaitView('Finale banner failed', () => this.views.banner.showFinale(won.movesLeft));
        }
        let progress = won;
        while (turn !== null && !run.cancelled) {
            progress = turn.progress;
            await this.showTurn(run, game, turn);
            await this.wait(ControllerFeel.finalePause);
            turn = game.playFinale();
        }
        return progress;
    }

    /** Last resort for a flow that broke past the view guards: the board is redrawn from the model. */
    private recover(run: Run, game: BlastGame, error: unknown): void {
        console.error('Game flow failed, recovering from the model', error);
        if (run.cancelled) {
            return;
        }
        this.redrawBoard(game);
        const progress = game.progressSnapshot;
        if (progress.status === 'playing') {
            this.showRewards(game);
            this.enterIdle();
        } else {
            this.setInput(new LockedInput());
            this.tryView('Result popup failed', () => this.views.result.show(progress));
        }
    }

    /** Between turns only: the board clears the badges itself when the next turn starts. */
    private showRewards(game: BlastGame): void {
        this.tryView('Reward badges failed', () => this.views.board.showRewards(game.rewards()));
    }

    private warnIfLowOnMoves(progress: ProgressSnapshot): void {
        if (this.lowMovesWarned || progress.movesLeft > ControllerFeel.lowMoves) {
            return;
        }
        this.lowMovesWarned = true;
        this.tryView('HUD failed', () => this.views.hud.warnLowMoves(progress.movesLeft));
    }

    /** The model is the source of truth: a broken animation gives way to a redraw, and the game goes on. */
    private async animateBoard(run: Run, game: BlastGame, animate: () => Promise<void>): Promise<void> {
        try {
            await animate();
        } catch (error) {
            console.error('Board animation failed, redrawing the board', error);
            if (!run.cancelled) {
                this.redrawBoard(game);
            }
        }
    }

    private redrawBoard(game: BlastGame): void {
        // A stale picture still beats a frozen game.
        this.tryView('Board redraw failed', () => this.views.board.render(game.currentBoard));
    }

    private showProgress(game: BlastGame, progress: ProgressSnapshot): void {
        this.views.hud.showProgress(progress);
        this.showCharges(game);
    }

    private showCharges(game: BlastGame): void {
        game.boosterIds().forEach((id) => this.views.boosters.showCharges(id, game.boosterCharges(id)));
    }

    private setInput(state: InputState): void {
        const previous = this.input;
        this.input = state;
        // Cues only decorate a state: one that throws is logged, and the controller is in the new state all the same.
        this.tryView('Input cues failed', () => {
            this.hint.stop();
            previous.exit();
            this.views.board.setAcceptingTaps(state.acceptsTaps);
            state.enter();
            state.onCellPointed(this.pointer);
        });
        if (state.offersHint) {
            this.hint.restart();
        }
    }

    /** Views draw what the model already decided, so one that throws is logged and the flow goes on. */
    private tryView(label: string, show: () => void): void {
        try {
            show();
        } catch (error) {
            console.error(label, error);
        }
    }

    private async awaitView(label: string, show: () => Promise<void>): Promise<void> {
        try {
            await show();
        } catch (error) {
            console.error(label, error);
        }
    }

    private wait(seconds: number): Promise<void> {
        return new Promise<void>((resolve) => {
            this.clock.schedule(seconds, () => resolve());
        });
    }

    private beginRun(): Run {
        this.run.cancelled = true;
        this.run = { cancelled: false };
        return this.run;
    }

    private currentGame(): BlastGame {
        if (this.game === null) {
            throw new Error('GameController.start() was not called');
        }
        return this.game;
    }
}
