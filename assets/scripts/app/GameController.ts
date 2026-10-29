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
export class GameController implements InputContext {
    private game: BlastGame | null = null;
    private input: InputState = new LockedInput();
    private readonly subscriptions: Array<() => void>;

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

    enterIdle(): void {
        this.setInput(new IdleInput(this));
    }

    enterAiming(boosterId: string): void {
        this.setInput(new BoosterAimingInput(this, boosterId));
    }

    tap(at: GridPos): void {
        const result = this.currentGame().tap(at);
        if (result === null) {
            this.views.board.rejectTap(at);
            return;
        }
        void this.playTurn(result);
    }

    useBooster(id: string, targets: ReadonlyArray<GridPos>): void {
        const result = this.currentGame().useBooster(id, targets);
        if (result === null) {
            this.views.board.rejectTap(targets[targets.length - 1]);
            this.enterIdle();
            return;
        }
        void this.playTurn(result);
    }

    boosterCharges(id: string): number {
        return this.currentGame().boosterCharges(id);
    }

    boosterTargetCount(id: string): number {
        return this.currentGame().boosterTargetCount(id);
    }

    selectBooster(id: string | null): void {
        this.views.boosters.select(id);
    }

    markTargets(cells: ReadonlyArray<GridPos>): void {
        this.views.board.markTargets(cells);
    }

    private async playTurn(result: TurnResult): Promise<void> {
        this.setInput(new LockedInput());
        this.views.boosters.select(null);
        this.views.board.markTargets([]);
        this.refreshHud();

        try {
            await this.views.board.play(result.steps);
        } catch (error) {
            // The model is the source of truth: a broken animation must not leave the game locked.
            console.error('Turn animation failed, redrawing the board', error);
            this.views.board.render(this.currentGame().currentBoard);
        }

        if (result.progress.status === 'playing') {
            this.enterIdle();
        } else {
            this.views.result.show(result.progress);
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
