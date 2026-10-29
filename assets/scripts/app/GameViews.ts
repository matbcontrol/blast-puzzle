import { ReadonlyBoard } from '../core/board/Board';
import { GridPos } from '../core/board/GridPos';
import { TurnStep } from '../core/game/TurnStep';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Signal } from './Signal';

/**
 * What the controller needs from the screen. Cocos components implement these,
 * tests use plain fakes, and the controller never touches `cc`.
 */
export interface BoardPresenter {
    readonly cellTapped: Signal<GridPos>;
    render(board: ReadonlyBoard): void;
    play(steps: ReadonlyArray<TurnStep>): Promise<void>;
    rejectTap(at: GridPos): void;
    markTargets(cells: ReadonlyArray<GridPos>): void;
}

export interface HudPresenter {
    showProgress(progress: ProgressSnapshot): void;
}

export interface BoosterPresenter {
    readonly boosterPressed: Signal<string>;
    showCharges(id: string, charges: number): void;
    select(id: string | null): void;
}

export interface ResultPresenter {
    readonly restartRequested: Signal<void>;
    show(progress: ProgressSnapshot): void;
    hide(): void;
}

export interface GameViews {
    readonly board: BoardPresenter;
    readonly hud: HudPresenter;
    readonly boosters: BoosterPresenter;
    readonly result: ResultPresenter;
}
