import { GridPos } from '../core/board/GridPos';
import { BlastGame, TurnResult } from '../core/game/BlastGame';
import { Clock } from './Clock';
import { GameViews } from './GameViews';
import { IdleHint } from './IdleHint';
import { BoosterAimingInput } from './input/BoosterAimingInput';
import { IdleInput } from './input/IdleInput';
import { InputContext, InputState } from './input/InputState';
import { LockedInput } from './input/LockedInput';

/**
 * Glues the model to the screen: routes input to the game and replays turn results on the views.
 * Input is locked while a turn animates, so a fast double tap can never desync model and view.
 */
export class GameController {
    private game: BlastGame | null = null;
    private input: InputState = new LockedInput();
    /** Kept across states, so a new state shows its cues where the pointer already rests. */
    private pointer: GridPos | null = null;
    private readonly hint: IdleHint;
    private readonly subscriptions: Array<() => void>;

    // Only input states get these, so nothing outside can tap past the lock.
    private readonly inputContext: InputContext = {
        enterIdle: () => this.enterIdle(),
        enterAiming: (boosterId) => this.enterAiming(boosterId),
        tap: (at) => this.tap(at),
        useBooster: (id, targets) => this.useBooster(id, targets),
        boosterCharges: (id) => this.currentGame().boosterCharges(id),
        boosterTargetCount: (id) => this.currentGame().boosterTargetCount(id),
        tapPreview: (at) => this.currentGame().tapPreview(at),
        boosterPreview: (id, at) => this.currentGame().boosterPreview(id, at),
        selectBooster: (id) => this.views.boosters.select(id),
        rejectBooster: (id) => this.views.boosters.rejectPress(id),
        markTargets: (cells) => this.views.board.markTargets(cells),
        showTapPreview: (cells) => this.views.board.showTapPreview(cells),
        showBoosterPreview: (cells) => this.views.board.showBoosterPreview(cells),
    };

    constructor(
        private readonly newGame: () => BlastGame,
        private readonly views: GameViews,
        clock: Clock,
    ) {
        this.hint = new IdleHint(clock, () => this.currentGame().hint(), views.board);
        this.subscriptions = [
            views.board.cellTapped.add((cell) => this.handleInput((input) => input.onCellTapped(cell))),
            views.board.cellPointed.add((cell) => {
                this.pointer = cell;
                this.handleInput((input) => input.onCellPointed(cell));
            }),
            views.boosters.boosterPressed.add((id) => this.handleInput((input) => input.onBoosterPressed(id))),
            views.result.restartRequested.add(() => this.start()),
        ];
    }

    /** Deals a new board and announces its goal. Input stays locked until both are done. */
    start(): void {
        const game = this.newGame();
        this.game = game;
        this.setInput(new LockedInput());
        this.views.result.hide();
        this.views.board.render(game.currentBoard);
        this.refreshHud();
        this.playIntro(game).catch((error) => this.unlock('Level intro failed, unlocking input', error));
    }

    dispose(): void {
        this.subscriptions.forEach((unsubscribe) => unsubscribe());
        this.setInput(new LockedInput());
        this.game = null;
    }

    /** Any input takes a shown hint back and starts the wait for the next one. */
    private handleInput(route: (input: InputState) => void): void {
        const state = this.input;
        this.hint.stop();
        route(state);
        // A state change has already restarted the wait, or kept the hint off.
        if (this.input === state && state.offersHint) {
            this.hint.restart();
        }
    }

    private async playIntro(game: BlastGame): Promise<void> {
        try {
            await Promise.all([this.views.board.intro(), this.views.banner.showGoal(game.progressSnapshot)]);
        } catch (error) {
            console.error('Level intro failed, redrawing the board', error);
            this.redrawBoard();
        }
        // Restarted or disposed meanwhile: that game is no longer the one on screen.
        if (this.game === game) {
            this.enterIdle();
        }
    }

    private enterIdle(): void {
        this.setInput(new IdleInput(this.inputContext));
    }

    private enterAiming(boosterId: string): void {
        this.setInput(new BoosterAimingInput(this.inputContext, boosterId));
    }

    private tap(at: GridPos): void {
        const result = this.currentGame().tap(at);
        if (result === null) {
            this.views.board.rejectTap(at);
            return;
        }
        this.playTurn(result);
    }

    private useBooster(id: string, targets: ReadonlyArray<GridPos>): void {
        const result = this.currentGame().useBooster(id, targets);
        if (result === null) {
            this.views.board.rejectTap(targets[targets.length - 1]);
            this.enterIdle();
            return;
        }
        this.playTurn(result);
    }

    private playTurn(result: TurnResult): void {
        this.animateTurn(result).catch((error) => this.unlock('Turn failed, unlocking input', error));
    }

    private async animateTurn(result: TurnResult): Promise<void> {
        const game = this.currentGame();
        this.setInput(new LockedInput());
        this.clearCues();
        this.refreshHud();

        try {
            await this.views.board.play(result.steps);
        } catch (error) {
            // The model is the source of truth: a broken animation must not leave the game locked.
            console.error('Turn animation failed, redrawing the board', error);
            this.redrawBoard();
        }

        if (this.game !== game) {
            return;
        }
        if (result.progress.status === 'playing') {
            this.enterIdle();
        } else {
            this.views.result.show(result.progress);
        }
    }

    /** No enter(): the views just threw, and a second throw here would escape unhandled. */
    private unlock(message: string, error: unknown): void {
        console.error(message, error);
        this.input = new IdleInput(this.inputContext);
    }

    private redrawBoard(): void {
        try {
            this.views.board.render(this.currentGame().currentBoard);
        } catch (error) {
            // A stale picture still beats a frozen game, so the turn goes on.
            console.error('Board redraw failed', error);
        }
    }

    private refreshHud(): void {
        const game = this.currentGame();
        this.views.hud.showProgress(game.progressSnapshot);
        game.boosterIds().forEach((id) => this.views.boosters.showCharges(id, game.boosterCharges(id)));
    }

    /** Cues belong to resting tiles: the turn animations take the nodes over next. */
    private clearCues(): void {
        this.views.boosters.select(null);
        this.views.board.markTargets([]);
        this.views.board.showTapPreview([]);
        this.views.board.showBoosterPreview([]);
    }

    private setInput(state: InputState): void {
        this.hint.stop();
        this.input = state;
        state.enter();
        state.onCellPointed(this.pointer);
        if (state.offersHint) {
            this.hint.restart();
        }
    }

    private currentGame(): BlastGame {
        if (this.game === null) {
            throw new Error('GameController.start() was not called');
        }
        return this.game;
    }
}
