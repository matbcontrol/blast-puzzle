import { GridPos } from '../core/board/GridPos';
import { BlastGame, TurnResult } from '../core/game/BlastGame';
import { GameViews } from './GameViews';
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
    private readonly subscriptions: Array<() => void>;

    // Only input states get these, so nothing outside can tap past the lock.
    private readonly inputContext: InputContext = {
        enterIdle: () => this.enterIdle(),
        enterAiming: (boosterId) => this.enterAiming(boosterId),
        tap: (at) => this.tap(at),
        useBooster: (id, targets) => this.useBooster(id, targets),
        boosterCharges: (id) => this.currentGame().boosterCharges(id),
        boosterTargetCount: (id) => this.currentGame().boosterTargetCount(id),
        selectBooster: (id) => this.views.boosters.select(id),
        markTargets: (cells) => this.views.board.markTargets(cells),
    };

    constructor(
        private readonly newGame: () => BlastGame,
        private readonly views: GameViews,
    ) {
        this.subscriptions = [
            views.board.cellTapped.add((cell) => this.input.onCellTapped(cell)),
            views.boosters.boosterPressed.add((id) => this.input.onBoosterPressed(id)),
            views.result.restartRequested.add(() => this.start()),
        ];
    }

    start(): void {
        this.game = this.newGame();
        this.views.result.hide();
        this.views.board.render(this.game.currentBoard);
        this.refreshHud();
        this.enterIdle();
    }

    dispose(): void {
        this.subscriptions.forEach((unsubscribe) => unsubscribe());
        this.setInput(new LockedInput());
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
        this.animateTurn(result).catch((error) => {
            console.error('Turn failed, unlocking input', error);
            // No enter(): the views just threw, and a second throw here would escape unhandled.
            this.input = new IdleInput(this.inputContext);
        });
    }

    private async animateTurn(result: TurnResult): Promise<void> {
        this.setInput(new LockedInput());
        this.views.boosters.select(null);
        this.views.board.markTargets([]);
        this.refreshHud();

        try {
            await this.views.board.play(result.steps);
        } catch (error) {
            // The model is the source of truth: a broken animation must not leave the game locked.
            console.error('Turn animation failed, redrawing the board', error);
            this.redrawBoard();
        }

        if (result.progress.status === 'playing') {
            this.enterIdle();
        } else {
            this.views.result.show(result.progress);
        }
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

    private setInput(state: InputState): void {
        this.input = state;
        state.enter();
    }

    private currentGame(): BlastGame {
        if (this.game === null) {
            throw new Error('GameController.start() was not called');
        }
        return this.game;
    }
}
