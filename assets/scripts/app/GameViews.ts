import { ReadonlyBoard } from '../core/board/Board';
import { GridPos } from '../core/board/GridPos';
import { TurnStep } from '../core/game/TurnStep';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { Signal } from './Signal';

/**
 * What the controller needs from the screen. Cocos components implement these,
 * tests use plain fakes, and the controller never touches `cc`.
 */
export interface BoardPresenter extends BoardCues {
    readonly cellTapped: Signal<GridPos>;
    /** Where a tap would land right now: the cell under the mouse, or under a finger that is down. */
    readonly cellPointed: Signal<GridPos | null>;
    render(board: ReadonlyBoard): void;
    /** Deals the rendered board in. Resolves once every tile rests. */
    intro(): Promise<void>;
    play(steps: ReadonlyArray<TurnStep>): Promise<void>;
    rejectTap(at: GridPos): void;
}

/** Cues over resting tiles between turns. Each call replaces the cells of its kind, and [] clears them. */
export interface BoardCues {
    markTargets(cells: ReadonlyArray<GridPos>): void;
    /** What a tap at the pointer would burn. */
    showTapPreview(cells: ReadonlyArray<GridPos>): void;
    /** What the aimed booster would hit at the pointer. */
    showBoosterPreview(cells: ReadonlyArray<GridPos>): void;
    showHint(cells: ReadonlyArray<GridPos>): void;
    clearHint(): void;
}

export interface HudPresenter {
    showProgress(progress: ProgressSnapshot): void;
}

export interface BoosterPresenter {
    readonly boosterPressed: Signal<string>;
    showCharges(id: string, charges: number): void;
    select(id: string | null): void;
    /** The player pressed a booster that has no charges left. */
    rejectPress(id: string): void;
}

export interface ResultPresenter {
    readonly restartRequested: Signal<void>;
    show(progress: ProgressSnapshot): void;
    hide(): void;
}

export interface BannerPresenter {
    /** Announces the goal of the level. Resolves once the banner is gone. */
    showGoal(progress: ProgressSnapshot): Promise<void>;
}

export interface GameViews {
    readonly board: BoardPresenter;
    readonly hud: HudPresenter;
    readonly boosters: BoosterPresenter;
    readonly result: ResultPresenter;
    readonly banner: BannerPresenter;
}
