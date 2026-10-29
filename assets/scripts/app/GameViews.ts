import { ReadonlyBoard } from '../core/board/Board';
import { GridPos } from '../core/board/GridPos';
import { TurnStep } from '../core/game/TurnStep';
import { ProgressSnapshot } from '../core/rules/LevelProgress';
import { RewardGroup } from '../core/rules/SuperTileRewards';
import { CellRelease } from './CellRelease';
import { Signal } from './Signal';

/**
 * What the controller needs from the screen. Cocos components implement these,
 * tests use plain fakes, and the controller never touches `cc`.
 * A method keeps its name on both sides of the boundary: the input states call the same names.
 */
export interface GameViews {
    readonly board: BoardPresenter;
    readonly hud: HudPresenter;
    readonly boosters: BoosterPresenter;
    readonly result: ResultPresenter;
    readonly banner: BannerPresenter;
}

export interface BoardPresenter extends BoardCues {
    /** Every release over a cell after a press on the board. The input state decides whether it was a tap. */
    readonly cellReleased: Signal<CellRelease>;
    /** Where a tap would land right now: the cell under the mouse, or under a finger that is down. */
    readonly cellPointed: Signal<GridPos | null>;
    render(board: ReadonlyBoard): void;
    /** Deals the rendered board in. Resolves once every tile rests. */
    intro(): Promise<void>;
    play(steps: ReadonlyArray<TurnStep>): Promise<void>;
    /** A tap or a booster pick that does nothing there. */
    rejectTap(at: GridPos): void;
    /** Off while taps are dropped, so a pressed tile never looks accepted for nothing. */
    setAcceptingTaps(accepting: boolean): void;
}

/** Cues over resting tiles between turns. Each call replaces the cells of its kind, and [] clears them. */
export interface BoardCues {
    /** The cells an aimed booster has picked so far. */
    showTargets(cells: ReadonlyArray<GridPos>): void;
    /** What a tap at the pointer would burn. */
    showTapPreview(cells: ReadonlyArray<GridPos>): void;
    /** What the aimed booster would hit at the pointer. */
    showBoosterPreview(cells: ReadonlyArray<GridPos>): void;
    showHint(cells: ReadonlyArray<GridPos>): void;
    /** Marks the groups a tap would turn into a super tile, with the kind each may become. */
    showRewards(groups: ReadonlyArray<RewardGroup>): void;
}

export interface HudPresenter {
    /** A new game: its progress at once, with no count-up and no warning carried over from the last one. */
    reset(progress: ProgressSnapshot): void;
    /** Score, stars and moves after a turn. */
    showProgress(progress: ProgressSnapshot): void;
    /** Moves just ran low: comes once per game, and the warning lasts while the game goes on. */
    warnLowMoves(movesLeft: number): void;
}

/** Cues on the booster buttons. */
export interface BoosterCues {
    /** null deselects. */
    selectBooster(id: string | null): void;
    /** The player pressed a booster that has no charges left. */
    rejectBooster(id: string): void;
}

export interface BoosterPresenter extends BoosterCues {
    readonly boosterPressed: Signal<string>;
    showCharges(id: string, charges: number): void;
}

export interface ResultPresenter {
    readonly restartRequested: Signal<void>;
    /** The moment of the win, before the bonus round. Resolves when the first bonus move may go off. */
    celebrate(progress: ProgressSnapshot): Promise<void>;
    /** The verdict once the level is over, bonus round included. */
    show(progress: ProgressSnapshot): void;
    /** Resolves once the panel is gone: at once when none is up, with the running fade when it is closing. */
    hide(): Promise<void>;
}

export interface BannerPresenter {
    /** Announces the goal of the level. Resolves once the banner is gone. */
    showGoal(progress: ProgressSnapshot): Promise<void>;
    /** Announces that the moves left turn into bonus super tiles. Resolves once the banner is gone. */
    showFinale(movesLeft: number): Promise<void>;
    /** Sends the banner away early; its promise still resolves. Does nothing when no banner is up. */
    dismiss(): void;
}
